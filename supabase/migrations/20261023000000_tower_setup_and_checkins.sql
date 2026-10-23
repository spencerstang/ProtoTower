begin;

create or replace function app_private.plain_text_is_valid(
  candidate text,
  minimum_length integer,
  maximum_length integer
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select
    minimum_length >= 0
    and maximum_length >= minimum_length
    and candidate = btrim(candidate)
    and candidate = normalize(candidate, NFC)
    and char_length(candidate) between minimum_length and maximum_length
    and candidate !~ '[[:cntrl:]]'
    and candidate !~ '[[:space:]]{2,}'
    and not exists (
      select 1
      from (
        values
          (173, 173),
          (1536, 1541),
          (1564, 1564),
          (1757, 1757),
          (1807, 1807),
          (2192, 2193),
          (2274, 2274),
          (6158, 6158),
          (8203, 8207),
          (8234, 8238),
          (8288, 8292),
          (8294, 8303),
          (65279, 65279),
          (65529, 65531),
          (69821, 69821),
          (69837, 69837),
          (78896, 78933),
          (113824, 113827),
          (119155, 119162),
          (917505, 917505),
          (917536, 917631)
      ) as format_ranges(first_codepoint, last_codepoint)
      cross join lateral generate_series(first_codepoint, last_codepoint) as format_codepoint
      where strpos(candidate, chr(format_codepoint)) > 0
    )
$$;

create or replace function app_private.tower_title_is_valid(candidate text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select app_private.plain_text_is_valid(candidate, 1, 80)
$$;

create or replace function app_private.dates_are_distinct(candidate date[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select
    cardinality(candidate) <= 24
    and cardinality(candidate) = (
      select count(*)
      from unnest(candidate) as value
      where value is not null
    )
    and cardinality(candidate) = (
      select count(distinct value)
      from unnest(candidate) as value
    )
$$;

create or replace function app_private.metric_preset_matches(
  candidate_preset text,
  candidate_kind text,
  candidate_shape text
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case candidate_preset
    when 'weight' then candidate_kind = 'ongoing' and candidate_shape = 'weight'
    when 'feeling' then candidate_kind = 'ongoing' and candidate_shape = 'rating'
    when 'blood-pressure' then candidate_kind = 'ongoing' and candidate_shape = 'blood_pressure'
    when 'note' then candidate_kind = 'ongoing' and candidate_shape = 'qualitative'
    when 'workouts' then candidate_kind = 'proxy' and candidate_shape = 'count'
    when 'sleep-hours' then candidate_kind = 'proxy' and candidate_shape = 'hours'
    when 'outreach' then candidate_kind = 'proxy' and candidate_shape = 'count'
    when 'goal-complete' then candidate_kind = 'final' and candidate_shape = 'complete_incomplete'
    when 'success-rating' then candidate_kind = 'final' and candidate_shape = 'scale_1_5'
    when 'percent-successful' then candidate_kind = 'final' and candidate_shape = 'percent'
    else false
  end
$$;

create or replace function app_private.tower_period_start(
  candidate_cadence text,
  candidate_custom_dates date[],
  anchor_date date,
  today date
)
returns date
language sql
stable
set search_path = pg_catalog
as $$
  select case candidate_cadence
    when 'daily' then today
    when 'weekly' then date_trunc('week', today::timestamp)::date
    when 'biweekly' then (
      select week_start + (((today - week_start) / 14) * 14)
      from (
        select date_trunc('week', anchor_date::timestamp)::date as week_start
      ) as anchor
    )
    when 'monthly' then date_trunc('month', today::timestamp)::date
    when 'quarterly' then date_trunc('quarter', today::timestamp)::date
    when 'annually' then date_trunc('year', today::timestamp)::date
    when 'custom' then (
      select specified
      from unnest(candidate_custom_dates) as specified
      where specified = today
      limit 1
    )
    else null
  end
$$;

alter table public.personal_towers
  add column definition text,
  add column cadence text not null default 'weekly',
  add column audience text not null default 'private',
  add column identity_mode text not null default 'named',
  add column custom_dates date[] not null default '{}';

alter table public.personal_towers
  add constraint personal_towers_definition_valid
    check (definition is null or app_private.plain_text_is_valid(definition, 1, 160)),
  add constraint personal_towers_cadence_valid
    check (cadence in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom')),
  add constraint personal_towers_audience_valid
    check (audience in ('private', 'shared')),
  add constraint personal_towers_identity_valid
    check (identity_mode in ('named', 'anonymous')),
  add constraint personal_towers_private_is_named
    check (audience <> 'private' or identity_mode = 'named'),
  add constraint personal_towers_custom_dates_valid
    check (
      (
        cadence = 'custom'
        and cardinality(custom_dates) between 1 and 24
        and app_private.dates_are_distinct(custom_dates)
      )
      or (
        cadence <> 'custom'
        and cardinality(custom_dates) = 0
      )
    );

comment on column public.personal_towers.definition is
  'Optional private one-line description. Empty input is stored as null.';
comment on column public.personal_towers.cadence is
  'Check-in rhythm. The check-in form is the same for every cadence.';
comment on column public.personal_towers.audience is
  'Owner preference only. Shared does not grant other accounts access.';
comment on column public.personal_towers.identity_mode is
  'Named or anonymous preference. Forced to named while audience is private.';
comment on column public.personal_towers.custom_dates is
  'UTC calendar dates used only when cadence is custom.';

create table public.tower_protocols (
  id uuid primary key default gen_random_uuid(),
  tower_id uuid not null references public.personal_towers (id) on delete cascade,
  position integer not null,
  title text not null,
  how_to text not null,
  source_protocol_id uuid,
  source_protocol_version integer,
  created_at timestamptz not null default now(),
  constraint tower_protocols_position_unique unique (tower_id, position) deferrable initially immediate,
  constraint tower_protocols_position_valid check (position between 1 and 20),
  constraint tower_protocols_title_valid check (app_private.plain_text_is_valid(title, 1, 80)),
  constraint tower_protocols_how_to_valid check (app_private.plain_text_is_valid(how_to, 1, 280)),
  constraint tower_protocols_source_pair check (
    (
      source_protocol_id is null
      and source_protocol_version is null
    )
    or (
      source_protocol_id is not null
      and source_protocol_version is not null
      and source_protocol_version > 0
    )
  ),
  constraint tower_protocols_source_version_fkey
    foreign key (source_protocol_id, source_protocol_version)
    references public.protocol_versions (protocol_id, version)
);

create unique index tower_protocols_one_source_idx
  on public.tower_protocols (tower_id, source_protocol_id)
  where source_protocol_id is not null;

comment on table public.tower_protocols is
  'Private protocol copies on a tower. Catalog rows stay immutable; a source id is provenance only.';

create table public.tower_metrics (
  id uuid primary key default gen_random_uuid(),
  tower_id uuid not null references public.personal_towers (id) on delete cascade,
  position integer not null,
  kind text not null,
  shape text not null,
  label text not null,
  preset_key text,
  created_at timestamptz not null default now(),
  constraint tower_metrics_position_unique unique (tower_id, position) deferrable initially immediate,
  constraint tower_metrics_position_valid check (position between 1 and 12),
  constraint tower_metrics_kind_valid check (kind in ('ongoing', 'proxy', 'final')),
  constraint tower_metrics_shape_valid check (
    (kind = 'ongoing' and shape in ('weight', 'rating', 'blood_pressure', 'qualitative'))
    or (kind = 'proxy' and shape in ('count', 'hours', 'rating'))
    or (kind = 'final' and shape in ('scale_1_5', 'complete_incomplete', 'percent'))
  ),
  constraint tower_metrics_label_valid check (app_private.plain_text_is_valid(label, 1, 80)),
  constraint tower_metrics_preset_valid check (
    preset_key is null
    or app_private.metric_preset_matches(preset_key, kind, shape)
  )
);

create unique index tower_metrics_one_preset_idx
  on public.tower_metrics (tower_id, preset_key)
  where preset_key is not null;

comment on table public.tower_metrics is
  'Private outcome definitions. A final metric is required once a tower has a setup. Values are not stored here.';

create table public.tower_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  tower_id uuid not null,
  period_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tower_checkins_tower_owner_fkey
    foreign key (tower_id, owner_id)
    references public.personal_towers (id, owner_id)
    on delete cascade,
  constraint tower_checkins_period_unique unique (tower_id, period_date)
);

comment on table public.tower_checkins is
  'One private check-in per tower period. Rows are owner records, not proof of efficacy or a health outcome.';

create index tower_checkins_owner_period_idx
  on public.tower_checkins (owner_id, tower_id, period_date desc);

create table public.tower_checkin_responses (
  checkin_id uuid not null references public.tower_checkins (id) on delete cascade,
  metric_id uuid not null references public.tower_metrics (id) on delete cascade,
  skipped boolean not null,
  numeric_value text,
  secondary_numeric text,
  text_value text,
  completion text,
  primary key (checkin_id, metric_id),
  constraint tower_checkin_responses_completion_valid
    check (completion is null or completion in ('complete', 'incomplete')),
  constraint tower_checkin_responses_numeric_text
    check (numeric_value is null or numeric_value ~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$'),
  constraint tower_checkin_responses_secondary_text
    check (secondary_numeric is null or secondary_numeric ~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$'),
  constraint tower_checkin_responses_text_valid
    check (text_value is null or app_private.plain_text_is_valid(text_value, 1, 280)),
  constraint tower_checkin_responses_skipped_empty
    check (
      not skipped
      or (
        numeric_value is null
        and secondary_numeric is null
        and text_value is null
        and completion is null
      )
    )
);

comment on table public.tower_checkin_responses is
  'Private metric readings for one check-in. Numeric readings are stored as validated text to avoid binary rounding.';

create table public.tower_checkin_protocol_marks (
  checkin_id uuid not null references public.tower_checkins (id) on delete cascade,
  protocol_id uuid not null references public.tower_protocols (id) on delete cascade,
  ran boolean not null,
  primary key (checkin_id, protocol_id),
  constraint tower_checkin_protocol_marks_ran_true check (ran)
);

comment on table public.tower_checkin_protocol_marks is
  'Optional private marks that a protocol was run. Unchecked protocols are omitted, not recorded as misses.';

alter table public.tower_protocols enable row level security;
alter table public.tower_protocols force row level security;
alter table public.tower_metrics enable row level security;
alter table public.tower_metrics force row level security;
alter table public.tower_checkins enable row level security;
alter table public.tower_checkins force row level security;
alter table public.tower_checkin_responses enable row level security;
alter table public.tower_checkin_responses force row level security;
alter table public.tower_checkin_protocol_marks enable row level security;
alter table public.tower_checkin_protocol_marks force row level security;

create policy tower_protocols_read_own
on public.tower_protocols
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

create policy tower_metrics_read_own
on public.tower_metrics
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

create policy tower_checkins_read_own
on public.tower_checkins
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy tower_checkin_responses_read_own
on public.tower_checkin_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.tower_checkins
    where tower_checkins.id = checkin_id
      and tower_checkins.owner_id = (select auth.uid())
  )
);

create policy tower_checkin_protocol_marks_read_own
on public.tower_checkin_protocol_marks
for select
to authenticated
using (
  exists (
    select 1
    from public.tower_checkins
    where tower_checkins.id = checkin_id
      and tower_checkins.owner_id = (select auth.uid())
  )
);

revoke all on table public.tower_protocols from public, anon, authenticated;
revoke all on table public.tower_metrics from public, anon, authenticated;
revoke all on table public.tower_checkins from public, anon, authenticated;
revoke all on table public.tower_checkin_responses from public, anon, authenticated;
revoke all on table public.tower_checkin_protocol_marks from public, anon, authenticated;

grant select on table public.tower_protocols to authenticated;
grant select on table public.tower_metrics to authenticated;
grant select on table public.tower_checkins to authenticated;
grant select on table public.tower_checkin_responses to authenticated;
grant select on table public.tower_checkin_protocol_marks to authenticated;

grant select, insert, update, delete on table public.tower_protocols to postgres, service_role;
grant select, insert, update, delete on table public.tower_metrics to postgres, service_role;
grant select, insert, update, delete on table public.tower_checkins to postgres, service_role;
grant select, insert, update, delete on table public.tower_checkin_responses to postgres, service_role;
grant select, insert, update, delete on table public.tower_checkin_protocol_marks to postgres, service_role;

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
    allowed := array['kind', 'shape', 'label', 'preset_key'];
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
        (parsed_kind = 'ongoing' and parsed_shape in ('weight', 'rating', 'blood_pressure', 'qualitative'))
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
          preset_key = parsed_preset
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
        preset_key
      )
      values (
        candidate_id,
        position_index,
        parsed_kind,
        parsed_shape,
        parsed_label,
        parsed_preset
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

create or replace function app_private.validated_definition(candidate text)
returns text
language plpgsql
stable
set search_path = pg_catalog, app_private
as $$
begin
  if candidate is null or btrim(candidate) = '' then
    return null;
  end if;
  if not app_private.plain_text_is_valid(candidate, 1, 160) then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;
  return candidate;
end;
$$;

create or replace function app_private.validated_identity(
  candidate_audience text,
  candidate_identity text
)
returns text
language plpgsql
stable
set search_path = pg_catalog
as $$
begin
  if candidate_audience not in ('private', 'shared') then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;
  if candidate_audience = 'private' then
    return 'named';
  end if;
  if candidate_identity not in ('named', 'anonymous') then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;
  return candidate_identity;
end;
$$;

create or replace function app_private.validated_dates(
  candidate_cadence text,
  candidate_dates date[]
)
returns date[]
language plpgsql
stable
set search_path = pg_catalog, app_private
as $$
declare
  stored date[];
begin
  if candidate_cadence not in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom') then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;
  stored := coalesce(candidate_dates, array[]::date[]);
  if candidate_cadence = 'custom' then
    if cardinality(stored) < 1
      or cardinality(stored) > 24
      or not app_private.dates_are_distinct(stored) then
      raise check_violation using message = 'Tower setup is invalid.';
    end if;
    return stored;
  end if;
  if cardinality(stored) <> 0 then
    raise check_violation using message = 'Tower setup is invalid.';
  end if;
  return array[]::date[];
end;
$$;

create or replace function public.create_configured_personal_tower(
  candidate_title text,
  candidate_definition text,
  candidate_cadence text,
  candidate_custom_dates date[],
  candidate_audience text,
  candidate_identity text,
  candidate_protocols jsonb,
  candidate_metrics jsonb
)
returns table (
  id uuid,
  title text,
  definition text,
  cadence text,
  audience text,
  identity_mode text,
  custom_dates date[],
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
  created_tower public.personal_towers%rowtype;
  stored_definition text;
  stored_identity text;
  stored_dates date[];
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if not app_private.tower_title_is_valid(candidate_title) then
    raise check_violation using message = 'Tower title is invalid.';
  end if;

  stored_definition := app_private.validated_definition(candidate_definition);
  stored_identity := app_private.validated_identity(candidate_audience, candidate_identity);
  stored_dates := app_private.validated_dates(candidate_cadence, candidate_custom_dates);

  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 0));
  if (select count(*) from public.personal_towers where owner_id = current_owner) >= 12 then
    raise check_violation using message = 'Tower limit reached.';
  end if;

  insert into public.personal_towers (
    owner_id,
    title,
    definition,
    cadence,
    audience,
    identity_mode,
    custom_dates
  )
  values (
    current_owner,
    candidate_title,
    stored_definition,
    candidate_cadence,
    candidate_audience,
    stored_identity,
    stored_dates
  )
  returning * into created_tower;

  perform app_private.replace_tower_setup(
    created_tower.id,
    candidate_protocols,
    candidate_metrics,
    3
  );

  return query
  select
    created_tower.id,
    created_tower.title,
    created_tower.definition,
    created_tower.cadence,
    created_tower.audience,
    created_tower.identity_mode,
    created_tower.custom_dates,
    created_tower.revision,
    created_tower.created_at,
    created_tower.updated_at;
end;
$$;

create or replace function public.save_tower_setup(
  candidate_id uuid,
  expected_revision bigint,
  candidate_title text,
  candidate_definition text,
  candidate_cadence text,
  candidate_custom_dates date[],
  candidate_audience text,
  candidate_identity text,
  candidate_protocols jsonb,
  candidate_metrics jsonb
)
returns table (
  id uuid,
  title text,
  definition text,
  cadence text,
  audience text,
  identity_mode text,
  custom_dates date[],
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
  stored_definition text;
  stored_identity text;
  stored_dates date[];
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if candidate_id is null
    or expected_revision is null
    or expected_revision < 0
    or not app_private.tower_title_is_valid(candidate_title) then
    raise check_violation using message = 'Tower setup is invalid.';
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

  stored_definition := app_private.validated_definition(candidate_definition);
  stored_identity := app_private.validated_identity(candidate_audience, candidate_identity);
  stored_dates := app_private.validated_dates(candidate_cadence, candidate_custom_dates);

  update public.personal_towers
  set title = candidate_title,
      definition = stored_definition,
      cadence = candidate_cadence,
      audience = candidate_audience,
      identity_mode = stored_identity,
      custom_dates = stored_dates,
      revision = personal_towers.revision + 1,
      updated_at = clock_timestamp()
  where personal_towers.id = candidate_id
  returning * into saved_tower;

  perform app_private.replace_tower_setup(candidate_id, candidate_protocols, candidate_metrics, 20);

  return query
  select
    saved_tower.id,
    saved_tower.title,
    saved_tower.definition,
    saved_tower.cadence,
    saved_tower.audience,
    saved_tower.identity_mode,
    saved_tower.custom_dates,
    saved_tower.revision,
    saved_tower.created_at,
    saved_tower.updated_at;
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
      or item - array['metric_id', 'skipped', 'numeric_value', 'secondary_numeric', 'text_value', 'completion'] <> '{}'::jsonb
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
      if numeric_text is not null and numeric_text !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' then
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

      if metric_row.shape in ('weight', 'rating', 'scale_1_5', 'count', 'hours', 'percent') then
        if secondary_text is not null or note_text is not null or completion_text is not null or numeric_text is null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      elsif metric_row.shape = 'blood_pressure' then
        if numeric_text is null or secondary_text is null or note_text is not null or completion_text is not null then
          raise check_violation using message = 'Check-in input is invalid.';
        end if;
      elsif metric_row.shape = 'qualitative' then
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

  for item in select value from jsonb_array_elements(candidate_marks)
  loop
    insert into public.tower_checkin_protocol_marks (checkin_id, protocol_id, ran)
    values (saved_checkin_id, (item ->> 'protocol_id')::uuid, true);
  end loop;

  return saved_checkin_id;
end;
$$;

revoke all on function app_private.plain_text_is_valid(text, integer, integer) from public, anon, authenticated;
revoke all on function app_private.dates_are_distinct(date[]) from public, anon, authenticated;
revoke all on function app_private.metric_preset_matches(text, text, text) from public, anon, authenticated;
revoke all on function app_private.tower_period_start(text, date[], date, date) from public, anon, authenticated;
revoke all on function app_private.replace_tower_setup(uuid, jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function app_private.validated_definition(text) from public, anon, authenticated;
revoke all on function app_private.validated_identity(text, text) from public, anon, authenticated;
revoke all on function app_private.validated_dates(text, date[]) from public, anon, authenticated;

revoke all on function public.create_configured_personal_tower(text, text, text, date[], text, text, jsonb, jsonb)
  from public, anon;
revoke all on function public.save_tower_setup(uuid, bigint, text, text, text, date[], text, text, jsonb, jsonb)
  from public, anon;
revoke all on function public.record_tower_checkin(uuid, date, jsonb, jsonb) from public, anon;

grant execute on function public.create_configured_personal_tower(text, text, text, date[], text, text, jsonb, jsonb)
  to postgres, service_role, authenticated;
grant execute on function public.save_tower_setup(uuid, bigint, text, text, text, date[], text, text, jsonb, jsonb)
  to postgres, service_role, authenticated;
grant execute on function public.record_tower_checkin(uuid, date, jsonb, jsonb)
  to postgres, service_role, authenticated;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 6, "product_schema": true, "tower_setup": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
