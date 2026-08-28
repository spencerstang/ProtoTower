begin;
select plan(42);

create temporary table practice_test_ids (
  label text primary key,
  id uuid not null unique
);
grant select, insert on table practice_test_ids to authenticated;

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
    '40000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'practice-alpha@example.test',
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
    '40000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'practice-beta@example.test',
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

select results_eq(
  $$ select (value ->> 'milestone')::integer >= 4 from app_private.platform_metadata where key = 'schema_stage' $$,
  array[true],
  'schema metadata records Milestone 4 or later'
);
select has_table(
  'public',
  'protocol_practice_checkins',
  'private practice check-ins table exists'
);
select col_is_pk(
  'public',
  'protocol_practice_checkins',
  'id',
  'practice check-in id is the primary key'
);
select has_function(
  'public',
  'set_protocol_practice_checkin',
  array['uuid', 'uuid', 'integer', 'date', 'boolean'],
  'bounded practice mutation RPC exists'
);
select results_eq(
  $$
    select prosecdef
      and 'search_path=pg_catalog, public, auth' = any(coalesce(proconfig, array[]::text[]))
    from pg_proc
    where oid = 'public.set_protocol_practice_checkin(uuid,uuid,integer,date,boolean)'::regprocedure
  $$,
  array[true],
  'practice mutation is security-definer with a fixed reviewed search path'
);
select results_eq(
  $$
    select count(*)::integer
    from pg_constraint
    where conrelid = 'public.protocol_practice_checkins'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) =
        'UNIQUE (owner_id, tower_id, protocol_id, protocol_version, practice_date)'
  $$,
  array[1],
  'database uniqueness protects concurrent record retries'
);
select results_eq(
  $$
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'public.protocol_practice_checkins'::regclass
  $$,
  $$ values (true, true) $$,
  'practice check-ins enable and force RLS'
);
select results_eq(
  $$
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'protocol_practice_checkins'
  $$,
  array[1],
  'practice check-ins expose one reviewed owner-read policy'
);
select ok(
  not has_table_privilege('anon', 'public.protocol_practice_checkins', 'select')
  and not has_function_privilege(
    'anon',
    'public.set_protocol_practice_checkin(uuid,uuid,integer,date,boolean)',
    'execute'
  ),
  'anonymous role has no practice read or mutation privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.protocol_practice_checkins', 'select')
  and not has_table_privilege('authenticated', 'public.protocol_practice_checkins', 'insert')
  and not has_table_privilege('authenticated', 'public.protocol_practice_checkins', 'update')
  and not has_table_privilege('authenticated', 'public.protocol_practice_checkins', 'delete'),
  'authenticated role receives read-only practice table privileges'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_protocol_practice_checkin(uuid,uuid,integer,date,boolean)',
    'execute'
  ),
  'authenticated role can execute the reviewed practice mutation RPC'
);

set local role anon;
select throws_ok(
  $$ select count(*) from public.protocol_practice_checkins $$,
  '42501',
  'permission denied for table protocol_practice_checkins',
  'anonymous callers cannot query practice history'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.practice_test_ids (label, id)
    select 'primary', id from public.create_personal_tower('Practice primary')
  $$,
  'user A can create the primary practice tower'
);
select lives_ok(
  $$
    insert into pg_temp.practice_test_ids (label, id)
    select 'secondary', id from public.create_personal_tower('Practice secondary')
  $$,
  'user A can create a separate practice tower'
);
select lives_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      'Practice primary',
      '[{"protocol_id":"10000000-0000-4000-8000-000000000001","protocol_version":2,"position":1}]'::jsonb,
      0
    )
  $$,
  'user A can pin an exact current protocol version'
);
select throws_ok(
  $$
    insert into public.protocol_practice_checkins (
      owner_id, tower_id, protocol_id, protocol_version, practice_date
    )
    values (
      '40000000-0000-4000-8000-000000000001',
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date
    )
  $$,
  '42501',
  'permission denied for table protocol_practice_checkins',
  'authenticated callers cannot write practice rows directly'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      true
    )
  $$,
  'owner can record current exact membership'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      true
    )
  $$,
  'repeating a record request is idempotent'
);
select results_eq(
  $$ select count(*)::integer from public.protocol_practice_checkins $$,
  array[1],
  'idempotent record produces one row'
);
select results_eq(
  $$
    select protocol_version, practice_date
    from public.protocol_practice_checkins
  $$,
  $$ values (2, current_date) $$,
  'owner reads the exact version and selected date'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date - 30,
      true
    )
  $$,
  '23514',
  'Practice input is invalid.',
  'dates before the thirty-day window are rejected'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date + 2,
      true
    )
  $$,
  '23514',
  'Practice input is invalid.',
  'dates beyond the one-day UTC allowance are rejected'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      1,
      current_date,
      true
    )
  $$,
  'P0002',
  'Practice target was not found.',
  'a mismatched protocol version is rejected without a membership oracle'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      null,
      true
    )
  $$,
  '23514',
  'Practice input is invalid.',
  'malformed null practice input fails before protected membership checks'
);
select lives_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      'Practice primary',
      '[]'::jsonb,
      1
    )
  $$,
  'owner can remove the practiced block'
);
select results_eq(
  $$ select count(*)::integer from public.protocol_practice_checkins $$,
  array[1],
  'removing current membership preserves practice history'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date - 1,
      true
    )
  $$,
  'P0002',
  'Practice target was not found.',
  'removed membership cannot create new practice history'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      false
    )
  $$,
  'owner can undo retained history after membership removal'
);
select results_eq(
  $$ select count(*)::integer from public.protocol_practice_checkins $$,
  array[0],
  'undo removes the exact historical row'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      false
    )
  $$,
  'repeating undo is idempotent'
);
select lives_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      'Practice primary',
      '[{"protocol_id":"10000000-0000-4000-8000-000000000001","protocol_version":2,"position":1}]'::jsonb,
      2
    )
  $$,
  'owner can restore membership for cascade tests'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      true
    )
  $$,
  'owner can record history for the primary cascade test'
);
select lives_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.practice_test_ids where label = 'secondary'),
      'Practice secondary',
      '[{"protocol_id":"10000000-0000-4000-8000-000000000003","protocol_version":1,"position":1}]'::jsonb,
      0
    )
  $$,
  'owner can pin a different version in the secondary tower'
);
select lives_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'secondary'),
      '10000000-0000-4000-8000-000000000003',
      1,
      current_date - 1,
      true
    )
  $$,
  'owner can record separate secondary-tower history'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$ select count(*)::integer from public.protocol_practice_checkins $$,
  array[0],
  'user B cannot read user A practice history'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      true
    )
  $$,
  'P0002',
  'Practice target was not found.',
  'user B cannot record against user A tower'
);
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      false
    )
  $$,
  'P0002',
  'Practice target was not found.',
  'user B cannot undo user A history'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
select throws_ok(
  $$
    select public.set_protocol_practice_checkin(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      '10000000-0000-4000-8000-000000000001',
      2,
      current_date,
      true
    )
  $$,
  '42501',
  'Authentication is required.',
  'database role without a verified user session is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$
    select public.delete_personal_tower(
      (select id from pg_temp.practice_test_ids where label = 'primary'),
      3
    )
  $$,
  'owner can delete the primary tower'
);
select results_eq(
  $$ select count(*)::integer from public.protocol_practice_checkins $$,
  array[1],
  'tower deletion cascades only its own practice history'
);

reset role;
delete from auth.users where id = '40000000-0000-4000-8000-000000000001';
select results_eq(
  $$
    select count(*)::integer
    from public.protocol_practice_checkins
    where owner_id = '40000000-0000-4000-8000-000000000001'
  $$,
  array[0],
  'Auth user deletion cascades all remaining owned practice history'
);
select results_eq(
  $$
    select count(*)::integer
    from auth.users
    where id = '40000000-0000-4000-8000-000000000002'
  $$,
  array[1],
  'deleting user A does not affect user B'
);

select * from finish();
rollback;
