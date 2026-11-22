begin;

alter table public.tower_protocols add column personal_note text;
alter table public.tower_protocols add constraint tower_protocols_personal_note_valid check (
  personal_note is null or (
    source_protocol_id is not null and app_private.plain_text_is_valid(personal_note, 1, 280)
  )
);

comment on column public.tower_protocols.personal_note is
  'Private owner adaptation. The pinned published protocol definition remains separate.';

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
  previous_notes jsonb;
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
    allowed := array['title', 'how_to', 'source_protocol_id', 'source_protocol_version', 'personal_note'];
    if item ? 'id' then
      allowed := array_append(allowed, 'id');
    end if;
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['title', 'how_to', 'source_protocol_id', 'source_protocol_version']
      or item - allowed <> '{}'::jsonb
      or jsonb_typeof(item -> 'title') <> 'string'
      or jsonb_typeof(item -> 'how_to') <> 'string'
      or (item ? 'personal_note' and jsonb_typeof(item -> 'personal_note') not in ('string', 'null'))
      or (item ->> 'personal_note' is not null and (
        item ->> 'source_protocol_id' is null
        or not app_private.plain_text_is_valid(item ->> 'personal_note', 1, 280)
      ))
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
      allowed := array_append(allowed, 'id');
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

  select coalesce(jsonb_object_agg(
    id::text || ':' || source_protocol_id::text || ':' || source_protocol_version::text, personal_note
  ), '{}'::jsonb)
  into previous_notes
  from public.tower_protocols
  where tower_id = candidate_id and personal_note is not null;

  update public.tower_protocols
  set personal_note = null,
      source_protocol_id = null,
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
          personal_note = case
            when parsed_source is null then null
            when item ? 'personal_note' then item ->> 'personal_note'
            else previous_notes ->> (parsed_protocol_id::text || ':' || parsed_source::text || ':' || parsed_version::text)
          end,
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
        personal_note,
        source_protocol_id,
        source_protocol_version
      )
      values (
        candidate_id,
        position_index,
        parsed_title,
        parsed_how_to,
        item ->> 'personal_note',
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

alter table public.personal_tower_items add column personal_note text;
alter table public.personal_tower_items add constraint personal_tower_items_personal_note_valid check (
  personal_note is null or app_private.plain_text_is_valid(personal_note, 1, 280)
);
comment on column public.personal_tower_items.personal_note is
  'Private owner adaptation for this exact library protocol version.';

create or replace function public.save_personal_tower(
  candidate_id uuid,
  candidate_title text,
  candidate_items jsonb,
  expected_revision bigint
)
returns table (
  id uuid,
  title text,
  revision bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_tower public.personal_towers%rowtype;
  saved_tower public.personal_towers%rowtype;
  item jsonb;
  previous_notes jsonb;
  expected_position integer := 1;
  parsed_protocol_id uuid;
  parsed_protocol_version integer;
  seen_protocol_ids uuid[] := array[]::uuid[];
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if candidate_id is null
    or expected_revision is null
    or expected_revision < 0
    or not app_private.tower_title_is_valid(candidate_title)
    or candidate_items is null
    or jsonb_typeof(candidate_items) <> 'array'
    or jsonb_array_length(candidate_items) > 20 then
    raise check_violation using message = 'Tower input is invalid.';
  end if;

  select *
  into current_tower
  from public.personal_towers
  where personal_towers.id = candidate_id
    and personal_towers.owner_id = current_owner
  for update;

  if not found then
    raise no_data_found using message = 'Tower was not found.';
  end if;

  if current_tower.revision <> expected_revision then
    raise serialization_failure using message = 'Tower revision is stale.';
  end if;

  for item in select value from jsonb_array_elements(candidate_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['protocol_id', 'protocol_version', 'position']
      or item - array['protocol_id', 'protocol_version', 'position'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'protocol_id') <> 'string'
      or jsonb_typeof(item -> 'protocol_version') <> 'number'
      or (item ->> 'protocol_version') !~ '^[1-9][0-9]*$'
      or jsonb_typeof(item -> 'position') <> 'number'
      or (item ->> 'position') !~ '^[1-9][0-9]*$'
      or (item ->> 'position')::integer <> expected_position then
      raise check_violation using message = 'Tower items are invalid.';
    end if;

    begin
      parsed_protocol_id := (item ->> 'protocol_id')::uuid;
      parsed_protocol_version := (item ->> 'protocol_version')::integer;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise check_violation using message = 'Tower items are invalid.';
    end;

    if parsed_protocol_id = any(seen_protocol_ids) then
      raise unique_violation using message = 'A protocol can appear only once in a tower.';
    end if;

    if not exists (
      select 1
      from public.protocols
      join public.protocol_versions
        on protocol_versions.protocol_id = protocols.id
      where protocols.id = parsed_protocol_id
        and protocols.status = 'active'
        and protocol_versions.version = parsed_protocol_version
        and protocol_versions.published_at is not null
    ) then
      raise foreign_key_violation using message = 'Protocol version is unavailable.';
    end if;

    seen_protocol_ids := array_append(seen_protocol_ids, parsed_protocol_id);
    expected_position := expected_position + 1;
  end loop;

  select coalesce(jsonb_object_agg(protocol_id::text || ':' || protocol_version::text, personal_note), '{}'::jsonb)
  into previous_notes
  from public.personal_tower_items
  where tower_id = candidate_id and personal_note is not null;

  delete from public.personal_tower_items
  where tower_id = candidate_id;

  insert into public.personal_tower_items (
    tower_id,
    protocol_id,
    protocol_version,
    position,
    personal_note
  )
  select
    candidate_id,
    (value ->> 'protocol_id')::uuid,
    (value ->> 'protocol_version')::integer,
    (value ->> 'position')::integer,
    previous_notes ->> (((value ->> 'protocol_id')::uuid)::text || ':' || (value ->> 'protocol_version'))
  from jsonb_array_elements(candidate_items);

  update public.personal_towers
  set title = candidate_title,
      revision = personal_towers.revision + 1,
      updated_at = clock_timestamp()
  where personal_towers.id = candidate_id
  returning * into saved_tower;

  return query
  select
    saved_tower.id,
    saved_tower.title,
    saved_tower.revision,
    saved_tower.created_at,
    saved_tower.updated_at;
end;
$$;

create function public.save_tower_item_note(
  candidate_id uuid,
  candidate_protocol_id uuid,
  candidate_protocol_version integer,
  candidate_note text,
  expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_revision bigint;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if candidate_id is null or candidate_protocol_id is null
    or candidate_protocol_version is null or candidate_protocol_version < 1
    or expected_revision is null or expected_revision < 0
    or (candidate_note is not null and not app_private.plain_text_is_valid(candidate_note, 1, 280)) then
    raise check_violation using message = 'Protocol note is invalid.';
  end if;

  select revision into current_revision
  from public.personal_towers
  where id = candidate_id and owner_id = current_owner
  for update;

  if not found then
    raise no_data_found using message = 'Tower was not found.';
  end if;
  if current_revision <> expected_revision then
    raise serialization_failure using message = 'Tower revision is stale.';
  end if;

  update public.personal_tower_items
  set personal_note = candidate_note
  where tower_id = candidate_id
    and protocol_id = candidate_protocol_id
    and protocol_version = candidate_protocol_version;

  if not found then
    raise no_data_found using message = 'Protocol was not found.';
  end if;

  update public.personal_towers
  set revision = current_revision + 1, updated_at = clock_timestamp()
  where id = candidate_id;
end;
$$;

revoke all on function public.save_tower_item_note(uuid, uuid, integer, text, bigint) from public, anon;
grant execute on function public.save_tower_item_note(uuid, uuid, integer, text, bigint) to authenticated, service_role, postgres;

commit;
