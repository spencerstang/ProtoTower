begin;
select plan(36);

select is(
  app_private.tower_period_start('weekly', '{}', '2026-10-05', '2026-10-23'),
  '2026-10-19'::date,
  'weekly period starts on Monday'
);
select is(
  app_private.tower_period_start('weekly', '{}', '2026-10-05', '2026-10-18'),
  '2026-10-12'::date,
  'weekly period for Sunday is the previous Monday'
);
select is(
  app_private.tower_period_start('biweekly', '{}', '2026-10-05', '2026-10-23'),
  '2026-10-19'::date,
  'biweekly period steps fourteen days from the anchor week'
);
select is(
  app_private.tower_period_start('monthly', '{}', '2026-10-05', '2026-10-23'),
  '2026-10-01'::date,
  'monthly period starts on the first of the month'
);
select is(
  app_private.tower_period_start('quarterly', '{}', '2026-10-05', '2026-10-23'),
  '2026-10-01'::date,
  'quarterly period starts on the first of the quarter'
);
select is(
  app_private.tower_period_start('annually', '{}', '2026-10-05', '2026-10-23'),
  '2026-01-01'::date,
  'annual period starts on the first of the year'
);
select is(
  app_private.tower_period_start('custom', array['2026-10-23'::date], '2026-10-05', '2026-10-23'),
  '2026-10-23'::date,
  'a specific date is open on that date'
);
select is(
  app_private.tower_period_start('custom', array['2026-11-01'::date], '2026-10-05', '2026-10-23'),
  null,
  'a specific-date tower is closed on other days'
);

select has_table('public', 'tower_protocols', 'tower protocols table exists');
select has_table('public', 'tower_metrics', 'tower metrics table exists');
select has_table('public', 'tower_checkins', 'tower check-ins table exists');
select has_table('public', 'tower_checkin_responses', 'tower check-in responses table exists');
select has_table('public', 'tower_checkin_protocol_marks', 'tower protocol marks table exists');
select has_function(
  'public',
  'create_configured_personal_tower',
  array['text', 'text', 'text', 'date[]', 'text', 'text', 'jsonb', 'jsonb'],
  'configured create RPC exists'
);
select has_function(
  'public',
  'save_tower_setup',
  array['uuid', 'bigint', 'text', 'text', 'text', 'date[]', 'text', 'text', 'jsonb', 'jsonb'],
  'setup save RPC exists'
);
select has_function(
  'public',
  'record_tower_checkin',
  array['uuid', 'date', 'jsonb', 'jsonb'],
  'check-in RPC exists'
);
select results_eq(
  $$
    select count(*)::integer
    from pg_class
    where oid in (
      'public.tower_protocols'::regclass,
      'public.tower_metrics'::regclass,
      'public.tower_checkins'::regclass,
      'public.tower_checkin_responses'::regclass,
      'public.tower_checkin_protocol_marks'::regclass
    )
      and relrowsecurity
      and relforcerowsecurity
  $$,
  array[5],
  'setup and check-in tables enable and force RLS'
);
select ok(
  not has_table_privilege('anon', 'public.tower_protocols', 'select')
  and not has_table_privilege('anon', 'public.tower_checkins', 'select'),
  'anonymous role cannot read setup or check-ins'
);
select ok(
  has_table_privilege('authenticated', 'public.tower_protocols', 'select')
  and has_table_privilege('authenticated', 'public.tower_metrics', 'select')
  and has_table_privilege('authenticated', 'public.tower_checkins', 'select')
  and not has_table_privilege('authenticated', 'public.tower_protocols', 'insert')
  and not has_table_privilege('authenticated', 'public.tower_checkins', 'insert'),
  'authenticated role can read and cannot write setup tables directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_configured_personal_tower(text,text,text,date[],text,text,jsonb,jsonb)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.record_tower_checkin(uuid,date,jsonb,jsonb)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.create_configured_personal_tower(text,text,text,date[],text,text,jsonb,jsonb)',
    'execute'
  ),
  'only authenticated callers can execute the setup RPCs'
);

create temporary table setup_test_ids (
  label text primary key,
  id uuid not null unique
);
grant select, insert on table setup_test_ids to authenticated;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'setup-alpha@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '31000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'setup-beta@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.setup_test_ids (label, id)
    select 'private', id
    from public.create_configured_personal_tower(
      'Sleep better',
      null,
      'weekly',
      array[]::date[],
      'private',
      'anonymous',
      jsonb_build_array(
        jsonb_build_object(
          'title', 'Morning light',
          'how_to', 'Go outside after waking.',
          'source_protocol_id', '20000000-0000-4000-8000-000000000001',
          'source_protocol_version', 1
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'ongoing',
          'shape', 'weight',
          'label', 'Weight',
          'preset_key', 'weight'
        ),
        jsonb_build_object(
          'kind', 'final',
          'shape', 'complete_incomplete',
          'label', 'Goal complete',
          'preset_key', 'goal-complete'
        )
      )
    )
  $$,
  'owner can create a private weekly tower with one protocol and one final'
);
select results_eq(
  $$
    select audience, identity_mode, cadence
    from public.personal_towers
    where id = (select id from pg_temp.setup_test_ids where label = 'private')
  $$,
  $$ values ('private'::text, 'named'::text, 'weekly'::text) $$,
  'private towers store named identity even when anonymous was submitted'
);
select lives_ok(
  $$
    insert into pg_temp.setup_test_ids (label, id)
    select 'shared', id
    from public.create_configured_personal_tower(
      'Shared practice',
      null,
      'weekly',
      array[]::date[],
      'shared',
      'anonymous',
      jsonb_build_array(
        jsonb_build_object(
          'title', 'Custom cue',
          'how_to', 'Do one small thing.',
          'source_protocol_id', null,
          'source_protocol_version', null
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'final',
          'shape', 'complete_incomplete',
          'label', 'Goal complete',
          'preset_key', 'goal-complete'
        )
      )
    )
  $$,
  'owner can save a shared anonymous preference'
);
select results_eq(
  $$
    select audience, identity_mode
    from public.personal_towers
    where id = (select id from pg_temp.setup_test_ids where label = 'shared')
  $$,
  $$ values ('shared'::text, 'anonymous'::text) $$,
  'shared towers keep the anonymous preference'
);
select throws_ok(
  $$
    select *
    from public.create_configured_personal_tower(
      'No protocol',
      null,
      'weekly',
      array[]::date[],
      'private',
      'named',
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'final',
          'shape', 'complete_incomplete',
          'label', 'Goal complete',
          'preset_key', 'goal-complete'
        )
      )
    )
  $$,
  '23514',
  'Tower setup is invalid.',
  'a tower requires a protocol'
);
select throws_ok(
  $$
    select *
    from public.create_configured_personal_tower(
      'No final',
      null,
      'weekly',
      array[]::date[],
      'private',
      'named',
      jsonb_build_array(
        jsonb_build_object(
          'title', 'Custom cue',
          'how_to', 'Do one small thing.',
          'source_protocol_id', null,
          'source_protocol_version', null
        )
      ),
      '[]'::jsonb
    )
  $$,
  '23514',
  'Tower setup is invalid.',
  'a tower requires a final outcome'
);
select throws_ok(
  $$
    select *
    from public.create_configured_personal_tower(
      'Bad source',
      null,
      'weekly',
      array[]::date[],
      'private',
      'named',
      jsonb_build_array(
        jsonb_build_object(
          'title', 'Missing catalog row',
          'how_to', 'This source does not exist.',
          'source_protocol_id', '20000000-0000-4000-8000-000000000099',
          'source_protocol_version', 1
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'final',
          'shape', 'complete_incomplete',
          'label', 'Goal complete',
          'preset_key', 'goal-complete'
        )
      )
    )
  $$,
  '23514',
  'Tower setup is invalid.',
  'a starter must reference a published protocol version'
);
select throws_ok(
  $$
    select public.record_tower_checkin(
      (select id from pg_temp.setup_test_ids where label = 'private'),
      '2000-01-01'::date,
      '[]'::jsonb,
      '[]'::jsonb
    )
  $$,
  '23514',
  'Check-in period is closed.',
  'a check-in for another period is rejected'
);
select lives_ok(
  $$
    select public.record_tower_checkin(
      (select id from pg_temp.setup_test_ids where label = 'private'),
      date_trunc('week', (clock_timestamp() at time zone 'utc'))::date,
      (
        select jsonb_agg(
          case
            when kind = 'final' then jsonb_build_object(
              'metric_id', id,
              'skipped', false,
              'numeric_value', null,
              'secondary_numeric', null,
              'text_value', null,
              'completion', 'complete'
            )
            else jsonb_build_object(
              'metric_id', id,
              'skipped', true,
              'numeric_value', null,
              'secondary_numeric', null,
              'text_value', null,
              'completion', null
            )
          end
          order by position
        )
        from public.tower_metrics
        where tower_id = (select id from pg_temp.setup_test_ids where label = 'private')
      ),
      '[]'::jsonb
    )
  $$,
  'owner can record the current weekly check-in'
);
select lives_ok(
  $$
    select public.record_tower_checkin(
      (select id from pg_temp.setup_test_ids where label = 'private'),
      date_trunc('week', (clock_timestamp() at time zone 'utc'))::date,
      (
        select jsonb_agg(
          case
            when shape = 'weight' then jsonb_build_object(
              'metric_id', id,
              'skipped', false,
              'numeric_value', '181',
              'secondary_numeric', null,
              'text_value', null,
              'completion', null
            )
            else jsonb_build_object(
              'metric_id', id,
              'skipped', false,
              'numeric_value', null,
              'secondary_numeric', null,
              'text_value', null,
              'completion', 'incomplete'
            )
          end
          order by position
        )
        from public.tower_metrics
        where tower_id = (select id from pg_temp.setup_test_ids where label = 'private')
      ),
      '[]'::jsonb
    )
  $$,
  'owner can update the same period in place'
);
select results_eq(
  $$
    select count(*)::integer
    from public.tower_checkins
    where tower_id = (select id from pg_temp.setup_test_ids where label = 'private')
  $$,
  array[1],
  'one period keeps a single check-in row'
);
select results_eq(
  $$
    select r.completion
    from public.tower_checkin_responses as r
    join public.tower_metrics as m on m.id = r.metric_id
    where m.kind = 'final'
      and m.tower_id = (select id from pg_temp.setup_test_ids where label = 'private')
  $$,
  array['incomplete'::text],
  'final completion updates in place'
);
select results_eq(
  $$
    select r.numeric_value
    from public.tower_checkin_responses as r
    join public.tower_metrics as m on m.id = r.metric_id
    where m.shape = 'weight'
      and m.tower_id = (select id from pg_temp.setup_test_ids where label = 'private')
  $$,
  array['181'::text],
  'ongoing weight is stored as validated text'
);
select throws_ok(
  $$
    insert into public.tower_protocols (tower_id, position, title, how_to)
    values (
      (select id from pg_temp.setup_test_ids where label = 'private'),
      2,
      'Direct write',
      'Should fail.'
    )
  $$,
  '42501',
  'permission denied for table tower_protocols',
  'authenticated callers cannot write protocols directly'
);

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$ select count(*)::integer from public.personal_towers $$,
  array[0],
  'another user cannot see private or shared towers'
);
select throws_ok(
  $$
    select public.record_tower_checkin(
      (select id from pg_temp.setup_test_ids where label = 'private'),
      date_trunc('week', (clock_timestamp() at time zone 'utc'))::date,
      '[]'::jsonb,
      '[]'::jsonb
    )
  $$,
  'P0002',
  'Tower was not found.',
  'another user cannot record a check-in'
);

select * from finish();
rollback;
