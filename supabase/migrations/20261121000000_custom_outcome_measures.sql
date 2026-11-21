begin;

-- Extend owner-only metric definitions without changing existing presets or data.
alter table public.tower_metrics add column unit text;
alter table public.tower_metrics add constraint tower_metrics_unit_valid check (
  unit is null or (shape = 'number' and app_private.plain_text_is_valid(unit, 1, 24))
);
alter table public.tower_metrics drop constraint tower_metrics_shape_valid;
alter table public.tower_metrics add constraint tower_metrics_shape_valid check (
  shape in ('number', 'text')
  or (kind = 'ongoing' and shape in ('weight', 'rating', 'blood_pressure', 'qualitative'))
  or (kind = 'proxy' and shape in ('count', 'hours', 'rating'))
  or (kind = 'final' and shape in ('scale_1_5', 'complete_incomplete', 'percent'))
);
alter table public.tower_checkin_responses drop constraint tower_checkin_responses_numeric_text;
alter table public.tower_checkin_responses add constraint tower_checkin_responses_numeric_text check (
  numeric_value is null or numeric_value ~ '^-?(0|[1-9][0-9]{0,15})(\.[0-9]{1,12})?$'
);

-- Dated private observations are separate from the current-period check-in.
create table public.tower_measurement_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tower_id uuid not null,
  metric_id uuid not null references public.tower_metrics(id) on delete cascade,
  label text not null check (app_private.plain_text_is_valid(label, 1, 80)),
  unit text check (unit is null or app_private.plain_text_is_valid(unit, 1, 24)),
  measured_on date not null check (measured_on >= date '1970-01-01'),
  numeric_value text check (numeric_value is null or numeric_value ~ '^-?(0|[1-9][0-9]{0,15})(\.[0-9]{1,12})?$'),
  text_value text check (text_value is null or app_private.plain_text_is_valid(text_value, 1, 280)),
  created_at timestamptz not null default now(),
  constraint tower_measurement_owner_fkey foreign key (tower_id, owner_id)
    references public.personal_towers(id, owner_id) on delete cascade,
  constraint tower_measurement_one_value check ((numeric_value is not null) <> (text_value is not null)),
  unique (metric_id, measured_on)
);
create index tower_measurement_history_idx on public.tower_measurement_observations(owner_id, tower_id, measured_on desc);
alter table public.tower_measurement_observations enable row level security;
alter table public.tower_measurement_observations force row level security;
create policy tower_measurement_read_own on public.tower_measurement_observations
  for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.tower_measurement_observations from public, anon, authenticated;
grant select on public.tower_measurement_observations to authenticated;
grant all on public.tower_measurement_observations to postgres, service_role;
comment on table public.tower_measurement_observations is
  'Owner-only dated numeric or text observations. Same metric and date corrections replace the reading; other dates are retained. No group sharing is implied.';

create or replace function app_private.replace_tower_setup(
  candidate_id uuid,
  candidate_protocols jsonb,
  candidate_metrics jsonb,
  maximum_protocols integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  item jsonb;
  allowed text[];
  parsed_title text;
  parsed_how_to text;
  parsed_source uuid;
  parsed_version integer;
  parsed_protocol_id uuid;
  parsed_metric_id uuid;
  parsed_kind text;
  parsed_shape text;
  parsed_label text;
  parsed_preset text;
  seen_titles text[] := array[]::text[];
  seen_sources uuid[] := array[]::uuid[];
  seen_protocol_ids uuid[] := array[]::uuid[];
  seen_labels text[] := array[]::text[];
  seen_presets text[] := array[]::text[];
  seen_metric_ids uuid[] := array[]::uuid[];
  kept_protocol_ids uuid[] := array[]::uuid[];
  kept_metric_ids uuid[] := array[]::uuid[];
  protocol_count integer;
  metric_count integer;
  final_count integer := 0;
  position_index integer := 0;
begin
  if candidate_id is null
    or maximum_protocols is null
    or maximum_protocols < 1
    or maximum_protocols > 20
    or candidate_protocols is null
    or jsonb_typeof(candidate_protocols) <> 'array'
    or candidate_metrics is null
    or jsonb_typeof(candidate_metrics) <> 'array' then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;

  protocol_count := jsonb_array_length(candidate_protocols);
  metric_count := jsonb_array_length(candidate_metrics);
  if protocol_count < 1
    or protocol_count > maximum_protocols
    or metric_count < 1
    or metric_count > 12 then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;

  for item in select value from jsonb_array_elements(candidate_protocols)
  loop
    allowed := array['title', 'how_to', 'source_protocol_id', 'source_protocol_version'];
    if item ? 'id' then
      allowed := allowed || 'id';
    end if;
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['title', 'how_to', 'source_protocol_id', 'source_protocol_version']
      or item - allowed <> '{}'::jsonb
      or jsonb_typeof(item -> 'title') <> 'string'
      or jsonb_typeof(item -> 'how_to') <> 'string'
      or jsonb_typeof(item -> 'source_protocol_id') not in ('string', 'null')
      or jsonb_typeof(item -> 'source_protocol_version') not in ('number', 'null')
      or not app_private.plain_text_is_valid(item ->> 'title', 1, 80)
      or not app_private.plain_text_is_valid(item ->> 'how_to', 1, 280) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;

    parsed_title := item ->> 'title';
    parsed_how_to := item ->> 'how_to';
    if exists (
      select 1 from unnest(seen_titles) as existing where lower(existing) = lower(parsed_title)
    ) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;
    seen_titles := array_append(seen_titles, parsed_title);

    if (item -> 'source_protocol_id') = 'null'::jsonb then
      if (item -> 'source_protocol_version') <> 'null'::jsonb then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
    else
      if jsonb_typeof(item -> 'source_protocol_version') <> 'number'
        or (item ->> 'source_protocol_version') !~ '^[1-9][0-9]*$' then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      begin
        parsed_source := (item ->> 'source_protocol_id')::uuid;
        parsed_version := (item ->> 'source_protocol_version')::integer;
      exception
        when invalid_text_representation or numeric_value_out_of_range then
          raise check_violation using message = 'Tower setup is invalid.';
      end;
      if parsed_source = any(seen_sources) then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      seen_sources := array_append(seen_sources, parsed_source);
      if not exists (
        select 1
        from public.protocols
        join public.protocol_versions
          on protocol_versions.protocol_id = protocols.id
        where protocols.id = parsed_source
          and protocols.status = 'active'
          and protocol_versions.version = parsed_version
          and protocol_versions.published_at is not null
      ) then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
    end if;

    if item ? 'id' then
      if jsonb_typeof(item -> 'id') <> 'string' then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      begin
        parsed_protocol_id := (item ->> 'id')::uuid;
      exception
        when invalid_text_representation then
          raise check_violation using message = 'Tower setup is invalid.';
      end;
      if parsed_protocol_id = any(seen_protocol_ids)
        or not exists (
          select 1
          from public.tower_protocols
          where id = parsed_protocol_id
            and tower_id = candidate_id
        ) then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      seen_protocol_ids := array_append(seen_protocol_ids, parsed_protocol_id);
    end if;
  end loop;

  for item in select value from jsonb_array_elements(candidate_metrics)
  loop
    allowed := array['kind', 'shape', 'label', 'preset_key', 'unit'];
    if item ? 'unit' and (jsonb_typeof(item -> 'unit') not in ('string', 'null') or ((item -> 'unit') <> 'null'::jsonb and (not app_private.plain_text_is_valid(item ->> 'unit', 1, 24) or item ->> 'shape' <> 'number'))) then
      raise check_violation using message = 'Metric unit is invalid.';
    end if;
    if item ? 'id' then
      allowed := allowed || 'id';
    end if;
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['kind', 'shape', 'label', 'preset_key']
      or item - allowed <> '{}'::jsonb
      or jsonb_typeof(item -> 'kind') <> 'string'
      or jsonb_typeof(item -> 'shape') <> 'string'
      or jsonb_typeof(item -> 'label') <> 'string'
      or jsonb_typeof(item -> 'preset_key') not in ('string', 'null')
      or not app_private.plain_text_is_valid(item ->> 'label', 1, 80) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;

    parsed_kind := item ->> 'kind';
    parsed_shape := item ->> 'shape';
    parsed_label := item ->> 'label';
    if parsed_kind not in ('ongoing', 'proxy', 'final')
      or not (
        parsed_shape in ('number', 'text')
        or (parsed_kind = 'ongoing' and parsed_shape in ('weight', 'rating', 'blood_pressure', 'qualitative'))
        or (parsed_kind = 'proxy' and parsed_shape in ('count', 'hours', 'rating'))
        or (parsed_kind = 'final' and parsed_shape in ('scale_1_5', 'complete_incomplete', 'percent'))
      ) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;
    if parsed_kind = 'final' then
      final_count := final_count + 1;
    end if;
    if exists (
      select 1 from unnest(seen_labels) as existing where lower(existing) = lower(parsed_label)
    ) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;
    seen_labels := array_append(seen_labels, parsed_label);

    if (item -> 'preset_key') = 'null'::jsonb then
      parsed_preset := null;
    else
      parsed_preset := item ->> 'preset_key';
      if parsed_preset = any(seen_presets)
        or not app_private.metric_preset_matches(parsed_preset, parsed_kind, parsed_shape) then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      seen_presets := array_append(seen_presets, parsed_preset);
    end if;

    if item ? 'id' then
      if jsonb_typeof(item -> 'id') <> 'string' then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      begin
        parsed_metric_id := (item ->> 'id')::uuid;
      exception
        when invalid_text_representation then
          raise check_violation using message = 'Tower setup is invalid.';
      end;
      if parsed_metric_id = any(seen_metric_ids)
        or not exists (
          select 1
          from public.tower_metrics
          where id = parsed_metric_id
            and tower_id = candidate_id
        ) then
        raise check_violation using message = 'Tower setup is invalid.';
      end if;
      seen_metric_ids := array_append(seen_metric_ids, parsed_metric_id);
    end if;
  end loop;

  if final_count < 1 then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;

  set constraints tower_protocols_position_unique, tower_metrics_position_unique deferred;

  update public.tower_protocols
  set source_protocol_id = null,
      source_protocol_version = null
  where tower_id = candidate_id;

  update public.tower_metrics
  set preset_key = null
  where tower_id = candidate_id;

  position_index := 0;
  for item in select value from jsonb_array_elements(candidate_protocols)
  loop
    position_index := position_index + 1;
    parsed_title := item ->> 'title';
    parsed_how_to := item ->> 'how_to';
    if (item -> 'source_protocol_id') = 'null'::jsonb then
      parsed_source := null;
      parsed_version := null;
    else
      parsed_source := (item ->> 'source_protocol_id')::uuid;
      parsed_version := (item ->> 'source_protocol_version')::integer;
    end if;

    if item ? 'id' then
      parsed_protocol_id := (item ->> 'id')::uuid;
      update public.tower_protocols
      set position = position_index,
          title = parsed_title,
          how_to = parsed_how_to,
          source_protocol_id = parsed_source,
          source_protocol_version = parsed_version
      where id = parsed_protocol_id
        and tower_id = candidate_id;
      kept_protocol_ids := array_append(kept_protocol_ids, parsed_protocol_id);
    else
      insert into public.tower_protocols (
        tower_id,
        position,
        title,
        how_to,
        source_protocol_id,
        source_protocol_version
      )
      values (
        candidate_id,
        position_index,
        parsed_title,
        parsed_how_to,
        parsed_source,
        parsed_version
      )
      returning id into parsed_protocol_id;
      kept_protocol_ids := array_append(kept_protocol_ids, parsed_protocol_id);
    end if;
  end loop;

  delete from public.tower_protocols
  where tower_id = candidate_id
    and not (id = any(kept_protocol_ids));

  position_index := 0;
  for item in select value from jsonb_array_elements(candidate_metrics)
  loop
    position_index := position_index + 1;
    parsed_kind := item ->> 'kind';
    parsed_shape := item ->> 'shape';
    parsed_label := item ->> 'label';
    parsed_preset := case
      when (item -> 'preset_key') = 'null'::jsonb then null
      else item ->> 'preset_key'
    end;
    if item ? 'id' then
      parsed_metric_id := (item ->> 'id')::uuid;
      update public.tower_metrics
      set position = position_index,
          kind = parsed_kind,
          shape = parsed_shape,
          label = parsed_label,
          preset_key = parsed_preset,
          unit = item ->> 'unit'
      where id = parsed_metric_id
        and tower_id = candidate_id;
      kept_metric_ids := array_append(kept_metric_ids, parsed_metric_id);
    else
      insert into public.tower_metrics (
        tower_id,
        position,
        kind,
        shape,
        label,
        preset_key,
        unit
      )
      values (
        candidate_id,
        position_index,
        parsed_kind,
        parsed_shape,
        parsed_label,
        parsed_preset,
        item ->> 'unit'
      )
      returning id into parsed_metric_id;
      kept_metric_ids := array_append(kept_metric_ids, parsed_metric_id);
    end if;
  end loop;

  delete from public.tower_metrics
  where tower_id = candidate_id
    and not (id = any(kept_metric_ids));
end;
$$;

create or replace function public.record_tower_checkin(
  candidate_tower_id uuid,
  candidate_period_date date,
  candidate_responses jsonb,
  candidate_marks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_tower public.personal_towers%rowtype;
  expected_period date;
  item jsonb;
  metric_row public.tower_metrics%rowtype;
  saved_checkin_id uuid;
  seen_metric_ids uuid[] := array[]::uuid[];
  all_metric_ids uuid[];
  parsed_metric_id uuid;
  parsed_protocol_id uuid;
  seen_protocol_ids uuid[] := array[]::uuid[];
  numeric_text text;
  secondary_text text;
  note_text text;
  completion_text text;
  skipped boolean;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if candidate_tower_id is null
    or candidate_period_date is null
    or candidate_responses is null
    or jsonb_typeof(candidate_responses) <> 'array'
    or candidate_marks is null
    or jsonb_typeof(candidate_marks) <> 'array'
    or jsonb_array_length(candidate_responses) > 12
    or jsonb_array_length(candidate_marks) > 20 then
    raise check_violation using message = 'Check-in input is invalid.';
  end if;

  select *
  into current_tower
  from public.personal_towers
  where id = candidate_tower_id
    and owner_id = current_owner
  for update;

  if not found then
    raise no_data_found using message = 'Tower was not found.';
  end if;

  expected_period := app_private.tower_period_start(
    current_tower.cadence,
    current_tower.custom_dates,
    (current_tower.created_at at time zone 'utc')::date,
    (clock_timestamp() at time zone 'utc')::date
  );
  if expected_period is null or candidate_period_date <> expected_period then
    raise check_violation using message = 'Check-in period is closed.';
  end if;

  select coalesce(array_agg(id order by id), array[]::uuid[])
  into all_metric_ids
  from public.tower_metrics
  where tower_id = candidate_tower_id;

  if cardinality(all_metric_ids) = 0
    or cardinality(all_metric_ids) <> jsonb_array_length(candidate_responses) then
    raise check_violation using message = 'Check-in input is invalid.';
  end if;

  for item in select value from jsonb_array_elements(candidate_responses)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['metric_id', 'skipped', 'numeric_value', 'secondary_numeric', 'text_value', 'completion']
      or item - array['metric_id', 'skipped', 'numeric_value', 'secondary_numeric', 'text_value', 'completion', 'measured_on'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'metric_id') <> 'string'
      or jsonb_typeof(item -> 'skipped') <> 'boolean'
      or jsonb_typeof(item -> 'numeric_value') not in ('string', 'number', 'null')
      or jsonb_typeof(item -> 'secondary_numeric') not in ('string', 'number', 'null')
      or jsonb_typeof(item -> 'text_value') not in ('string', 'null')
      or jsonb_typeof(item -> 'completion') not in ('string', 'null') then
      raise check_violation using message = 'Check-in input is invalid.';
    end if;

    begin
      parsed_metric_id := (item ->> 'metric_id')::uuid;
    exception
      when invalid_text_representation then
        raise check_violation using message = 'Check-in input is invalid.';
    end;
    if parsed_metric_id = any(seen_metric_ids) then
      raise check_violation using message = 'Check-in input is invalid.';
    end if;
    seen_metric_ids := array_append(seen_metric_ids, parsed_metric_id);

    select *
    into metric_row
    from public.tower_metrics
    where id = parsed_metric_id
      and tower_id = candidate_tower_id;
    if not found then
      raise check_violation using message = 'Check-in input is invalid.';
    end if;

    if item ? 'measured_on' then
      if jsonb_typeof(item -> 'measured_on') <> 'string' or item ->> 'measured_on' !~ '^\d{4}-\d{2}-\d{2}$' then
        raise check_violation using message = 'Measurement date is invalid.';
      end if;
      begin
        if (item ->> 'measured_on')::date < date '1970-01-01' or (item ->> 'measured_on')::date > current_date then
          raise check_violation using message = 'Measurement date is invalid.';
        end if;
      exception when datetime_field_overflow or invalid_datetime_format then
        raise check_violation using message = 'Measurement date is invalid.';
      end;
    end if;
    skipped := (item ->> 'skipped')::boolean;
    numeric_text := case
      when (item -> 'numeric_value') = 'null'::jsonb then null
      else item ->> 'numeric_value'
    end;
    secondary_text := case
      when (item -> 'secondary_numeric') = 'null'::jsonb then null
      else item ->> 'secondary_numeric'
    end;
    note_text := case
      when (item -> 'text_value') = 'null'::jsonb then null
      else item ->> 'text_value'
    end;
    completion_text := case
      when (item -> 'completion') = 'null'::jsonb then null
      else item ->> 'completion'
    end;

    if skipped then
      if metric_row.kind = 'final'
        or numeric_text is not null
        or secondary_text is not null
        or note_text is not null
        or completion_text is not null then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
    else
      if numeric_text is not null and (
        (metric_row.shape = 'number' and numeric_text !~ '^-?(0|[1-9][0-9]{0,15})(\.[0-9]{1,12})?$')
        or (metric_row.shape <> 'number' and numeric_text !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$')
      ) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if secondary_text is not null and secondary_text !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if note_text is not null and not app_private.plain_text_is_valid(note_text, 1, 280) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if completion_text is not null and completion_text not in ('complete', 'incomplete') then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;

      if metric_row.shape in ('number', 'weight', 'rating', 'scale_1_5', 'count', 'hours', 'percent') then
        if secondary_text is not null or note_text is not null or completion_text is not null or numeric_text is null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      elsif metric_row.shape = 'blood_pressure' then
        if numeric_text is null or secondary_text is null or note_text is not null or completion_text is not null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      elsif metric_row.shape in ('qualitative', 'text') then
        if note_text is null or numeric_text is not null or secondary_text is not null or completion_text is not null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      elsif metric_row.shape = 'complete_incomplete' then
        if completion_text is null or numeric_text is not null or secondary_text is not null or note_text is not null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      else
        raise check_violation using message = 'Check-in input is invalid.';
      end if;

      if metric_row.shape = 'weight'
        and (numeric_text::numeric < 0.01 or numeric_text::numeric > 1000 or numeric_text !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$') then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if metric_row.shape in ('rating', 'scale_1_5')
        and (numeric_text !~ '^[1-5]$') then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if metric_row.shape = 'count'
        and (numeric_text !~ '^(0|[1-9][0-9]*)$' or numeric_text::numeric > 10000) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if metric_row.shape = 'hours'
        and (numeric_text::numeric < 0 or numeric_text::numeric > 24) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if metric_row.shape = 'percent'
        and (numeric_text !~ '^(0|[1-9][0-9]*)$' or numeric_text::numeric > 100) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
      if metric_row.shape = 'blood_pressure'
        and (
          numeric_text !~ '^[1-9][0-9]*$'
          or secondary_text !~ '^[1-9][0-9]*$'
          or numeric_text::numeric < 70
          or numeric_text::numeric > 250
          or secondary_text::numeric < 40
          or secondary_text::numeric > 150
          or numeric_text::numeric <= secondary_text::numeric
        ) then
        raise check_violation using message = 'Check-in input is invalid.';
      end if;
    end if;
  end loop;

  if (
    select array_agg(value order by value)
    from unnest(seen_metric_ids) as value
  ) is distinct from all_metric_ids then
    raise check_violation using message = 'Check-in input is invalid.';
  end if;

  for item in select value from jsonb_array_elements(candidate_marks)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['protocol_id', 'ran']
      or item - array['protocol_id', 'ran'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'protocol_id') <> 'string'
      or (item -> 'ran') <> 'true'::jsonb then
      raise check_violation using message = 'Check-in input is invalid.';
    end if;
    begin
      parsed_protocol_id := (item ->> 'protocol_id')::uuid;
    exception
      when invalid_text_representation then
        raise check_violation using message = 'Check-in input is invalid.';
    end;
    if parsed_protocol_id = any(seen_protocol_ids)
      or not exists (
        select 1
        from public.tower_protocols
        where id = parsed_protocol_id
          and tower_id = candidate_tower_id
      ) then
      raise check_violation using message = 'Check-in input is invalid.';
    end if;
    seen_protocol_ids := array_append(seen_protocol_ids, parsed_protocol_id);
  end loop;

  insert into public.tower_checkins (owner_id, tower_id, period_date)
  values (current_owner, candidate_tower_id, candidate_period_date)
  on conflict (tower_id, period_date)
  do update set updated_at = clock_timestamp()
  returning tower_checkins.id into saved_checkin_id;

  delete from public.tower_checkin_responses where checkin_id = saved_checkin_id;
  delete from public.tower_checkin_protocol_marks where checkin_id = saved_checkin_id;

  for item in select value from jsonb_array_elements(candidate_responses)
  loop
    insert into public.tower_checkin_responses (
      checkin_id,
      metric_id,
      skipped,
      numeric_value,
      secondary_numeric,
      text_value,
      completion
    )
    values (
      saved_checkin_id,
      (item ->> 'metric_id')::uuid,
      (item ->> 'skipped')::boolean,
      case when (item -> 'numeric_value') = 'null'::jsonb then null else item ->> 'numeric_value' end,
      case when (item -> 'secondary_numeric') = 'null'::jsonb then null else item ->> 'secondary_numeric' end,
      case when (item -> 'text_value') = 'null'::jsonb then null else item ->> 'text_value' end,
      case when (item -> 'completion') = 'null'::jsonb then null else item ->> 'completion' end
    );
  end loop;

  for item in select value from jsonb_array_elements(candidate_responses)
  loop
    select * into metric_row from public.tower_metrics
      where id = (item ->> 'metric_id')::uuid and tower_id = candidate_tower_id;
    if metric_row.shape in ('number', 'text') and not (item ->> 'skipped')::boolean then
      insert into public.tower_measurement_observations
        (owner_id, tower_id, metric_id, label, unit, measured_on, numeric_value, text_value)
      values (current_owner, candidate_tower_id, metric_row.id, metric_row.label, metric_row.unit,
        coalesce((item ->> 'measured_on')::date, current_date),
        case when metric_row.shape = 'number' then item ->> 'numeric_value' else null end,
        case when metric_row.shape = 'text' then item ->> 'text_value' else null end)
      on conflict (metric_id, measured_on) do update set
        label = excluded.label, unit = excluded.unit,
        numeric_value = excluded.numeric_value, text_value = excluded.text_value;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(candidate_marks)
  loop
    insert into public.tower_checkin_protocol_marks (checkin_id, protocol_id, ran)
    values (saved_checkin_id, (item ->> 'protocol_id')::uuid, true);
  end loop;

  return saved_checkin_id;
end;
$$;

commit;
