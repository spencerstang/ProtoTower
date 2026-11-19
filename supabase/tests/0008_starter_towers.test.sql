begin;
select plan(42);

select has_table('public', 'starter_rules', 'starter rules table exists');
select has_table('public', 'starter_outcome_metrics', 'starter outcome metrics table exists');
select has_table('public', 'starter_adherence', 'starter adherence table exists');
select has_table('public', 'starter_outcome_readings', 'starter outcome readings table exists');
select has_table('public', 'check_in_reminder_preferences', 'reminder preferences table exists');
select has_table('public', 'check_in_reminder_sends', 'reminder send log table exists');

select results_eq(
  $$
    select count(*)::integer
    from pg_class
    where oid in (
      'public.starter_outcome_metrics'::regclass,
      'public.starter_adherence'::regclass,
      'public.starter_outcome_readings'::regclass,
      'public.check_in_reminder_preferences'::regclass,
      'public.check_in_reminder_sends'::regclass,
      'public.starter_rules'::regclass
    )
      and relrowsecurity
      and relforcerowsecurity
  $$,
  array[6],
  'starter tables enable and force row level security'
);

select ok(
  not has_table_privilege('anon', 'public.starter_adherence', 'select')
  and not has_table_privilege('anon', 'public.starter_outcome_readings', 'select')
  and not has_table_privilege('authenticated', 'public.starter_adherence', 'insert')
  and not has_table_privilege('authenticated', 'public.starter_outcome_readings', 'insert'),
  'adherence and outcome tables are owner-read and not directly writable'
);

select ok(
  has_function_privilege('authenticated', 'public.create_starter_tower(text,text)', 'execute')
  and not has_function_privilege('anon', 'public.create_starter_tower(text,text)', 'execute')
  and not has_function_privilege('anon', 'public.record_starter_adherence(uuid,jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.record_starter_outcome(uuid,boolean,text)', 'execute')
  and has_function_privilege('anon', 'public.opt_out_check_in_reminder(uuid)', 'execute')
  and not has_function_privilege(
    'authenticated',
    'app_private.due_check_in_reminders(date)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'app_private.claim_due_check_in_reminders(date)',
    'execute'
  ),
  'starter writes are authenticated, opt-out is public, and reminder claims are not'
);

select is(
  (
    select secondary_protocol_id::text
    from public.starter_rules
    where match_key = 'training'
  ),
  null,
  'a training-only rule leaves the second protocol blank'
);
select is(
  (
    select secondary_protocol_id::text
    from public.starter_rules
    where match_key = 'training-heat'
  ),
  '20000000-0000-4000-8000-000000000003',
  'heat is paired with the sauna protocol only on the heat rule'
);
select ok(
  (
    select overlap_note like '%not a claim%'
    from public.starter_rules
    where match_key = 'sleep'
  ),
  'the sleep pair describes editorial selection rather than effectiveness'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '32000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'starter-alpha@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '32000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'starter-beta@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );

create temporary table starter_ids (
  label text primary key,
  id uuid not null unique
);
grant select, insert on table starter_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.starter_ids (label, id)
    select 'sleep', id from public.create_starter_tower('Sleep better', 'sleep')
  $$,
  'owner can create a sleep starter tower'
);
select lives_ok(
  $$
    insert into pg_temp.starter_ids (label, id)
    select 'training', id from public.create_starter_tower('Work out 3x/week', 'training')
  $$,
  'owner can create a training starter tower'
);
select lives_ok(
  $$
    insert into pg_temp.starter_ids (label, id)
    select 'heat', id from public.create_starter_tower('Work out, then sauna', 'training-heat')
  $$,
  'owner can create a training-heat starter tower'
);
select lives_ok(
  $$
    insert into pg_temp.starter_ids (label, id)
    select 'plain', id from public.create_starter_tower('Save for a kitchen renovation', 'unmatched')
  $$,
  'owner can create an unmatched starter tower'
);

select results_eq(
  $$
    select protocol_id::text
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'sleep')
    order by position
  $$,
  array[
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004'
  ],
  'sleep pins the Huberman routine and then the Johnson routine'
);
select is(
  (
    select count(*)::integer
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  1,
  'training-only pins one protocol'
);
select is(
  (
    select protocol_id::text
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  '20000000-0000-4000-8000-000000000002',
  'training-only pins the Attia routine'
);
select is(
  (
    select count(*)::integer
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
      and protocol_id = '20000000-0000-4000-8000-000000000003'
  ),
  0,
  'training-only does not pin the sauna routine'
);
select is(
  (
    select count(*)::integer
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'heat')
      and protocol_id = '20000000-0000-4000-8000-000000000003'
  ),
  1,
  'a heat sentence pins the sauna routine beside training'
);
select is(
  (
    select count(*)::integer
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.starter_ids where label = 'plain')
  ),
  0,
  'an unmatched goal invents no protocol'
);
select is(
  (
    select count(*)::integer
    from public.starter_outcome_metrics
    where tower_id = (select id from pg_temp.starter_ids where label = 'plain')
  ),
  0,
  'an unmatched goal invents no outcome measure'
);
select is(
  (
    select count(*)::integer
    from public.starter_outcome_metrics
    where tower_id = (select id from pg_temp.starter_ids where label = 'sleep')
  ),
  1,
  'a reviewed pair stores one outcome label'
);

select throws_ok(
  $$
    select public.record_starter_adherence(
      (select id from pg_temp.starter_ids where label = 'training'),
      '[{"protocol_id":"20000000-0000-4000-8000-000000000003","status":"done"}]'::jsonb
    )
  $$,
  '23514',
  'Adherence input is invalid.',
  'adherence cannot mark a protocol that is not pinned'
);
select is(
  (
    select count(*)::integer
    from public.starter_adherence
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  0,
  'a rejected adherence mark writes no adherence row'
);

select lives_ok(
  $$
    select public.record_starter_adherence(
      (select id from pg_temp.starter_ids where label = 'training'),
      '[{"protocol_id":"20000000-0000-4000-8000-000000000002","status":"done"}]'::jsonb
    )
  $$,
  'owner can record weekly adherence'
);
select is(
  (
    select count(*)::integer
    from public.starter_outcome_readings
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  0,
  'an adherence save does not write an outcome'
);

select lives_ok(
  $$
    select public.record_starter_outcome(
      (select id from pg_temp.starter_ids where label = 'training'),
      false,
      'A flight of stairs felt familiar'
    )
  $$,
  'owner can record a weekly outcome'
);
select is(
  (
    select count(*)::integer
    from public.starter_adherence
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  1,
  'an outcome save does not add an adherence row'
);
select is(
  (
    select text_value
    from public.starter_outcome_readings
    where tower_id = (select id from pg_temp.starter_ids where label = 'training')
  ),
  'A flight of stairs felt familiar',
  'an outcome save stores the note on the outcome table'
);

select throws_ok(
  $$
    select public.record_starter_outcome(
      (select id from pg_temp.starter_ids where label = 'plain'),
      false,
      'Invented progress'
    )
  $$,
  'P0002',
  'Outcome measure was not found.',
  'an unmatched tower has no outcome to record'
);

select throws_ok(
  $$
    insert into public.starter_adherence (tower_id, protocol_id, period_start, status)
    values (
      (select id from pg_temp.starter_ids where label = 'training'),
      '20000000-0000-4000-8000-000000000002',
      current_date,
      'done'
    )
  $$,
  '42501',
  'permission denied for table starter_adherence',
  'the owner cannot write adherence except through the RPC'
);

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.starter_adherence),
  0,
  'another owner cannot read adherence'
);
select is(
  (select count(*)::integer from public.starter_outcome_readings),
  0,
  'another owner cannot read outcome readings'
);
select throws_ok(
  $$
    select public.record_starter_adherence(
      (select id from pg_temp.starter_ids where label = 'training'),
      '[{"protocol_id":"20000000-0000-4000-8000-000000000002","status":"skipped"}]'::jsonb
    )
  $$,
  'P0002',
  'Tower was not found.',
  'another owner cannot record adherence'
);
select throws_ok(
  $$
    select public.record_starter_outcome(
      (select id from pg_temp.starter_ids where label = 'training'),
      true,
      null
    )
  $$,
  'P0002',
  'Tower was not found.',
  'another owner cannot record an outcome'
);

reset role;
select is(
  (
    select count(*)::integer
    from app_private.due_check_in_reminders((clock_timestamp() at time zone 'utc')::date)
    where owner_id = '32000000-0000-4000-8000-000000000001'
  ),
  1,
  'a starter owner is due one reminder for the week'
);
select is(
  (
    select count(*)::integer
    from app_private.claim_due_check_in_reminders((clock_timestamp() at time zone 'utc')::date)
    where owner_id = '32000000-0000-4000-8000-000000000001'
  ),
  1,
  'claiming a reminder records the week without storing an address'
);
select is(
  (
    select count(*)::integer
    from app_private.due_check_in_reminders((clock_timestamp() at time zone 'utc')::date)
    where owner_id = '32000000-0000-4000-8000-000000000001'
  ),
  0,
  'a claimed week is not due again'
);
select is(
  public.opt_out_check_in_reminder(
    (
      select token
      from public.check_in_reminder_preferences
      where owner_id = '32000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'an opt-out token turns reminders off'
);
select is(
  (
    select opted_out
    from public.check_in_reminder_preferences
    where owner_id = '32000000-0000-4000-8000-000000000001'
  ),
  true,
  'the opt-out flag is stored for the owner'
);

select * from finish();
rollback;
