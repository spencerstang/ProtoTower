begin;

create table public.starter_rules (
  match_key text primary key,
  overlap_note text,
  metric_label text,
  primary_protocol_id uuid,
  primary_version integer,
  primary_title text,
  primary_slug text,
  primary_step_title text,
  primary_step_description text,
  secondary_protocol_id uuid,
  secondary_version integer,
  secondary_title text,
  secondary_slug text,
  show_cautions boolean not null default false,
  caution_lines text[] not null default '{}',
  constraint starter_rules_key_valid check (
    match_key in ('sleep', 'training', 'training-heat', 'unmatched')
  ),
  constraint starter_rules_metric_valid check (
    metric_label is null or app_private.plain_text_is_valid(metric_label, 1, 80)
  ),
  constraint starter_rules_shape check (
    case match_key
      when 'unmatched' then
        primary_protocol_id is null
        and secondary_protocol_id is null
        and metric_label is null
        and not show_cautions
        and cardinality(caution_lines) = 0
      when 'training' then
        primary_protocol_id is not null
        and primary_version is not null
        and secondary_protocol_id is null
        and metric_label is not null
        and not show_cautions
      when 'sleep' then
        primary_protocol_id is not null
        and secondary_protocol_id is not null
        and primary_version is not null
        and secondary_version is not null
        and metric_label is not null
        and not show_cautions
      when 'training-heat' then
        primary_protocol_id is not null
        and secondary_protocol_id is not null
        and primary_version is not null
        and secondary_version is not null
        and metric_label is not null
        and show_cautions
        and cardinality(caution_lines) >= 1
      else false
    end
  ),
  constraint starter_rules_primary_version_fkey
    foreign key (primary_protocol_id, primary_version)
    references public.protocol_versions (protocol_id, version),
  constraint starter_rules_secondary_version_fkey
    foreign key (secondary_protocol_id, secondary_version)
    references public.protocol_versions (protocol_id, version)
);

comment on table public.starter_rules is
  'Reviewed editorial pairs. A row selects published protocols. It is not an effectiveness ranking.';

insert into public.starter_rules (
  match_key,
  overlap_note,
  metric_label,
  primary_protocol_id,
  primary_version,
  primary_title,
  primary_slug,
  primary_step_title,
  primary_step_description,
  secondary_protocol_id,
  secondary_version,
  secondary_title,
  secondary_slug,
  show_cautions,
  caution_lines
)
values
  (
    'sleep',
    'Both published routines discuss late caffeine and evening light. This pair is a morning routine and an evening routine. It is an editorial selection of published protocols, not a claim that the pair is more effective.',
    'Wake-time variance',
    '20000000-0000-4000-8000-000000000001',
    1,
    'Andrew Huberman: Daily sleep-wake blueprint',
    'huberman-daily-sleep-wake-blueprint',
    'Get outdoor morning light',
    'Within 30–60 minutes of waking, go outdoors for 5–10 minutes on a sunny day, 10–15 minutes when cloudy, or up to 30 minutes when overcast. These weather-based durations are Huberman recommendations, not independently validated thresholds. Never stare directly at the sun.',
    '20000000-0000-4000-8000-000000000004',
    1,
    'Bryan Johnson: Pre-sleep resting-heart-rate routine',
    'johnson-pre-sleep-rhr-routine',
    false,
    '{}'
  ),
  (
    'training',
    'One reviewed training protocol is pinned. A second protocol was left blank. The sauna routine is not added for a training-only request.',
    'Functional task progress',
    '20000000-0000-4000-8000-000000000002',
    1,
    'Peter Attia: Centenarian Decathlon framework',
    'attia-centenarian-decathlon',
    'Define late-life functional goals',
    'List concrete physical tasks you want to retain late in life and use them to shape training. Review the list when health or priorities change; there is no fixed number of tasks.',
    null,
    null,
    null,
    null,
    false,
    '{}'
  ),
  (
    'training-heat',
    'The sauna routine is a separate heat practice, not a second workout. Read the published cautions before using heat. This pairing is editorial, not a claim that heat improves training.',
    'Functional task progress',
    '20000000-0000-4000-8000-000000000002',
    1,
    'Peter Attia: Centenarian Decathlon framework',
    'attia-centenarian-decathlon',
    'Define late-life functional goals',
    'List concrete physical tasks you want to retain late in life and use them to shape training. Review the list when health or priorities change; there is no fixed number of tasks.',
    '20000000-0000-4000-8000-000000000003',
    1,
    'Rhonda Patrick: Sauna and heat exposure',
    'patrick-sauna-heat-exposure',
    true,
    array[
      'This is general educational information, not a proven treatment or individualized heat prescription.',
      'Heat illness, dehydration, dizziness, and blood-pressure changes are possible; exit for confusion, weakness, severe discomfort, or concerning rapid heart rate.',
      'Seek qualified guidance for relevant cardiovascular disease, pregnancy, heat-sensitive medications or conditions, or prior heat intolerance.'
    ]::text[]
  ),
  (
    'unmatched',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    '{}'
  );

alter table public.starter_rules enable row level security;
alter table public.starter_rules force row level security;

create policy starter_rules_read
on public.starter_rules
for select
to anon, authenticated
using (true);

revoke all on table public.starter_rules from public, anon, authenticated;
grant select on table public.starter_rules to anon, authenticated;
grant select, insert, update, delete on table public.starter_rules to postgres, service_role;

alter table public.personal_towers
  add column intent_text text,
  add column starter_match_key text references public.starter_rules (match_key);

alter table public.personal_towers
  add constraint personal_towers_intent_valid
    check (intent_text is null or app_private.plain_text_is_valid(intent_text, 1, 160)),
  add constraint personal_towers_starter_intent
    check (starter_match_key is null or intent_text is not null);

comment on column public.personal_towers.intent_text is
  'Private answer to the one starting question. It is not a public catalog field.';
comment on column public.personal_towers.starter_match_key is
  'Reviewed starter rule used at creation. Null means a tower created by the earlier setup form.';

create index personal_towers_starter_owner_idx
  on public.personal_towers (owner_id, created_at)
  where starter_match_key is not null;

create table public.starter_outcome_metrics (
  id uuid primary key default gen_random_uuid(),
  tower_id uuid not null unique references public.personal_towers (id) on delete cascade,
  label text not null,
  constraint starter_outcome_metrics_label_valid check (
    app_private.plain_text_is_valid(label, 1, 80)
  )
);

comment on table public.starter_outcome_metrics is
  'One private outcome label chosen from a reviewed starter rule. It is not an adherence mark or a score.';

create table public.starter_adherence (
  tower_id uuid not null references public.personal_towers (id) on delete cascade,
  protocol_id uuid not null,
  period_start date not null,
  status text not null,
  primary key (tower_id, protocol_id, period_start),
  constraint starter_adherence_status_valid check (
    status in ('done', 'not_this_period', 'skipped')
  )
);

comment on table public.starter_adherence is
  'Private weekly practice marks. A row is not an outcome and is not proof that a protocol worked.';

create table public.starter_outcome_readings (
  tower_id uuid not null references public.personal_towers (id) on delete cascade,
  period_start date not null,
  skipped boolean not null,
  text_value text,
  primary key (tower_id, period_start),
  constraint starter_outcome_readings_text_valid check (
    (skipped and text_value is null)
    or (
      not skipped
      and text_value is not null
      and app_private.plain_text_is_valid(text_value, 1, 280)
    )
  )
);

comment on table public.starter_outcome_readings is
  'Private outcome notes for one weekly period. A blank note is stored as a skip. It is not a score.';

create table public.check_in_reminder_preferences (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  opted_out boolean not null default false,
  token uuid not null unique default gen_random_uuid()
);

comment on table public.check_in_reminder_preferences is
  'Private opt-out state for weekly check-in reminders. The token is an unguessable link secret, not an email address.';

create table public.check_in_reminder_sends (
  owner_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, period_start)
);

comment on table public.check_in_reminder_sends is
  'Records that a weekly reminder was claimed. It does not store an email address or tower content.';

alter table public.starter_outcome_metrics enable row level security;
alter table public.starter_outcome_metrics force row level security;
alter table public.starter_adherence enable row level security;
alter table public.starter_adherence force row level security;
alter table public.starter_outcome_readings enable row level security;
alter table public.starter_outcome_readings force row level security;
alter table public.check_in_reminder_preferences enable row level security;
alter table public.check_in_reminder_preferences force row level security;
alter table public.check_in_reminder_sends enable row level security;
alter table public.check_in_reminder_sends force row level security;

create policy starter_outcome_metrics_read_own
on public.starter_outcome_metrics
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

create policy starter_adherence_read_own
on public.starter_adherence
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

create policy starter_outcome_readings_read_own
on public.starter_outcome_readings
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

create policy check_in_reminder_preferences_read_own
on public.check_in_reminder_preferences
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy check_in_reminder_sends_read_own
on public.check_in_reminder_sends
for select
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.starter_outcome_metrics from public, anon, authenticated;
revoke all on table public.starter_adherence from public, anon, authenticated;
revoke all on table public.starter_outcome_readings from public, anon, authenticated;
revoke all on table public.check_in_reminder_preferences from public, anon, authenticated;
revoke all on table public.check_in_reminder_sends from public, anon, authenticated;

grant select on table public.starter_outcome_metrics to authenticated;
grant select on table public.starter_adherence to authenticated;
grant select on table public.starter_outcome_readings to authenticated;
grant select on table public.check_in_reminder_preferences to authenticated;
grant select on table public.check_in_reminder_sends to authenticated;

grant select, insert, update, delete on table public.starter_outcome_metrics to postgres, service_role;
grant select, insert, update, delete on table public.starter_adherence to postgres, service_role;
grant select, insert, update, delete on table public.starter_outcome_readings to postgres, service_role;
grant select, insert, update, delete on table public.check_in_reminder_preferences to postgres, service_role;
grant select, insert, update, delete on table public.check_in_reminder_sends to postgres, service_role;

create or replace function public.create_starter_tower(
  candidate_intent text,
  candidate_match_key text
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
  rule public.starter_rules%rowtype;
  created_tower public.personal_towers%rowtype;
  stored_title text;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if candidate_intent is null
    or not app_private.plain_text_is_valid(candidate_intent, 1, 160)
    or candidate_match_key is null then
    raise check_violation using message = 'Starter input is invalid.';
  end if;

  select *
  into rule
  from public.starter_rules
  where starter_rules.match_key = candidate_match_key;

  if not found then
    raise check_violation using message = 'Starter input is invalid.';
  end if;

  if char_length(candidate_intent) <= 80 then
    stored_title := candidate_intent;
  else
    stored_title := rtrim(left(candidate_intent, 77)) || '...';
  end if;
  if not app_private.tower_title_is_valid(stored_title) then
    raise check_violation using message = 'Starter input is invalid.';
  end if;

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
    custom_dates,
    intent_text,
    starter_match_key
  )
  values (
    current_owner,
    stored_title,
    null,
    'weekly',
    'private',
    'named',
    array[]::date[],
    candidate_intent,
    rule.match_key
  )
  returning * into created_tower;

  if rule.primary_protocol_id is not null then
    insert into public.personal_tower_items (tower_id, protocol_id, protocol_version, position)
    values (created_tower.id, rule.primary_protocol_id, rule.primary_version, 1);
  end if;
  if rule.secondary_protocol_id is not null then
    insert into public.personal_tower_items (tower_id, protocol_id, protocol_version, position)
    values (created_tower.id, rule.secondary_protocol_id, rule.secondary_version, 2);
  end if;
  if rule.metric_label is not null then
    insert into public.starter_outcome_metrics (tower_id, label)
    values (created_tower.id, rule.metric_label);
  end if;

  insert into public.check_in_reminder_preferences (owner_id)
  values (current_owner)
  on conflict (owner_id) do nothing;

  return query
  select
    created_tower.id,
    created_tower.title,
    created_tower.revision,
    created_tower.created_at,
    created_tower.updated_at;
end;
$$;

create or replace function public.record_starter_adherence(
  candidate_tower_id uuid,
  candidate_marks jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_tower public.personal_towers%rowtype;
  period_date date;
  item jsonb;
  parsed_protocol_id uuid;
  parsed_status text;
  seen uuid[] := array[]::uuid[];
  protocol_text text;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if candidate_tower_id is null
    or candidate_marks is null
    or jsonb_typeof(candidate_marks) <> 'array'
    or jsonb_array_length(candidate_marks) < 1
    or jsonb_array_length(candidate_marks) > 20 then
    raise check_violation using message = 'Adherence input is invalid.';
  end if;

  select *
  into current_tower
  from public.personal_towers
  where id = candidate_tower_id
    and owner_id = current_owner
  for update;

  if not found or current_tower.starter_match_key is null then
    raise no_data_found using message = 'Tower was not found.';
  end if;

  period_date := app_private.tower_period_start(
    'weekly',
    array[]::date[],
    (current_tower.created_at at time zone 'utc')::date,
    (clock_timestamp() at time zone 'utc')::date
  );

  for item in select value from jsonb_array_elements(candidate_marks) as marks(value)
  loop
    protocol_text := item->>'protocol_id';
    parsed_status := item->>'status';
    if protocol_text is null
      or protocol_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or parsed_status not in ('done', 'not_this_period', 'skipped') then
      raise check_violation using message = 'Adherence input is invalid.';
    end if;
    parsed_protocol_id := protocol_text::uuid;
    if parsed_protocol_id = any (seen)
      or not exists (
        select 1
        from public.personal_tower_items
        where tower_id = current_tower.id
          and protocol_id = parsed_protocol_id
      ) then
      raise check_violation using message = 'Adherence input is invalid.';
    end if;
    seen := seen || parsed_protocol_id;
  end loop;

  for item in select value from jsonb_array_elements(candidate_marks) as marks(value)
  loop
    parsed_protocol_id := (item->>'protocol_id')::uuid;
    parsed_status := item->>'status';
    insert into public.starter_adherence (tower_id, protocol_id, period_start, status)
    values (current_tower.id, parsed_protocol_id, period_date, parsed_status)
    on conflict (tower_id, protocol_id, period_start)
    do update set status = excluded.status;
  end loop;

  return true;
end;
$$;

create or replace function public.record_starter_outcome(
  candidate_tower_id uuid,
  candidate_skipped boolean,
  candidate_text text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_tower public.personal_towers%rowtype;
  period_date date;
  metric_id uuid;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if candidate_tower_id is null or candidate_skipped is null then
    raise check_violation using message = 'Outcome input is invalid.';
  end if;
  if candidate_skipped and candidate_text is not null then
    raise check_violation using message = 'Outcome input is invalid.';
  end if;
  if not candidate_skipped
    and (
      candidate_text is null
      or not app_private.plain_text_is_valid(candidate_text, 1, 280)
    ) then
    raise check_violation using message = 'Outcome input is invalid.';
  end if;

  select *
  into current_tower
  from public.personal_towers
  where id = candidate_tower_id
    and owner_id = current_owner
  for update;

  if not found or current_tower.starter_match_key is null then
    raise no_data_found using message = 'Tower was not found.';
  end if;

  select id
  into metric_id
  from public.starter_outcome_metrics
  where tower_id = current_tower.id;

  if not found then
    raise no_data_found using message = 'Outcome measure was not found.';
  end if;

  period_date := app_private.tower_period_start(
    'weekly',
    array[]::date[],
    (current_tower.created_at at time zone 'utc')::date,
    (clock_timestamp() at time zone 'utc')::date
  );

  insert into public.starter_outcome_readings (tower_id, period_start, skipped, text_value)
  values (current_tower.id, period_date, candidate_skipped, candidate_text)
  on conflict (tower_id, period_start)
  do update set skipped = excluded.skipped, text_value = excluded.text_value;

  return true;
end;
$$;

create or replace function public.opt_out_check_in_reminder(candidate_token uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_count integer;
begin
  if candidate_token is null then
    return false;
  end if;

  update public.check_in_reminder_preferences
  set opted_out = true
  where token = candidate_token;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function app_private.due_check_in_reminders(today date)
returns table (
  owner_id uuid,
  tower_id uuid,
  token uuid,
  period_start date
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select distinct on (tower.owner_id)
    tower.owner_id,
    tower.id,
    preference.token,
    app_private.tower_period_start(
      'weekly',
      array[]::date[],
      (tower.created_at at time zone 'utc')::date,
      today
    )
  from public.personal_towers as tower
  join public.check_in_reminder_preferences as preference
    on preference.owner_id = tower.owner_id
  where tower.starter_match_key is not null
    and preference.opted_out = false
    and today is not null
    and not exists (
      select 1
      from public.check_in_reminder_sends as sent
      where sent.owner_id = tower.owner_id
        and sent.period_start = app_private.tower_period_start(
          'weekly',
          array[]::date[],
          (tower.created_at at time zone 'utc')::date,
          today
        )
    )
  order by tower.owner_id, tower.created_at
$$;

create or replace function app_private.claim_due_check_in_reminders(today date)
returns table (
  owner_id uuid,
  tower_id uuid,
  token uuid,
  period_start date
)
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select *
    from app_private.due_check_in_reminders(today)
  ),
  inserted as (
    insert into public.check_in_reminder_sends (owner_id, period_start)
    select due.owner_id, due.period_start
    from due
    on conflict (owner_id, period_start) do nothing
    returning check_in_reminder_sends.owner_id, check_in_reminder_sends.period_start
  )
  select due.owner_id, due.tower_id, due.token, due.period_start
  from due
  join inserted
    on inserted.owner_id = due.owner_id
    and inserted.period_start = due.period_start;
end;
$$;

revoke all on function public.create_starter_tower(text, text) from public, anon;
revoke all on function public.record_starter_adherence(uuid, jsonb) from public, anon;
revoke all on function public.record_starter_outcome(uuid, boolean, text) from public, anon;
revoke all on function public.opt_out_check_in_reminder(uuid) from public;
revoke all on function app_private.due_check_in_reminders(date) from public, anon, authenticated;
revoke all on function app_private.claim_due_check_in_reminders(date) from public, anon, authenticated;

grant execute on function public.create_starter_tower(text, text) to postgres, service_role, authenticated;
grant execute on function public.record_starter_adherence(uuid, jsonb) to postgres, service_role, authenticated;
grant execute on function public.record_starter_outcome(uuid, boolean, text) to postgres, service_role, authenticated;
grant execute on function public.opt_out_check_in_reminder(uuid) to postgres, service_role, anon, authenticated;
grant execute on function app_private.due_check_in_reminders(date) to postgres, service_role;
grant execute on function app_private.claim_due_check_in_reminders(date) to postgres, service_role;

commit;
