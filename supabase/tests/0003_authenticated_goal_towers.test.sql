begin;
select plan(41);

create temporary table tower_test_ids (
  label text primary key,
  id uuid not null unique
);
grant select, insert on table tower_test_ids to authenticated;

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
    '30000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'tower-alpha@example.test',
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
    '30000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'tower-beta@example.test',
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
  $$ select (value ->> 'milestone')::integer >= 3 from app_private.platform_metadata where key = 'schema_stage' $$,
  array[true],
  'schema metadata records Milestone 3 or later'
);
select has_table('public', 'personal_towers', 'personal towers table exists');
select has_table('public', 'personal_tower_items', 'personal tower items table exists');
select col_is_pk('public', 'personal_towers', 'id', 'tower id is the primary key');
select col_is_pk(
  'public',
  'personal_tower_items',
  array['tower_id', 'protocol_id'],
  'tower membership identity is composite'
);
select has_function('public', 'create_personal_tower', array['text'], 'create RPC exists');
select has_function(
  'public',
  'save_personal_tower',
  array['uuid', 'text', 'jsonb', 'bigint'],
  'save RPC exists'
);
select has_function(
  'public',
  'delete_personal_tower',
  array['uuid', 'bigint'],
  'delete RPC exists'
);

select results_eq(
  $$
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'public.personal_towers'::regclass
  $$,
  $$ values (true, true) $$,
  'personal towers enable and force RLS'
);
select results_eq(
  $$
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'public.personal_tower_items'::regclass
  $$,
  $$ values (true, true) $$,
  'personal tower items enable and force RLS'
);
select results_eq(
  $$
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('personal_towers', 'personal_tower_items')
  $$,
  array[2],
  'private tables expose only two reviewed read policies'
);

select ok(
  not has_table_privilege('anon', 'public.personal_towers', 'select')
  and not has_table_privilege('anon', 'public.personal_tower_items', 'select'),
  'anonymous role has no private table privileges'
);
select ok(
  not has_function_privilege('anon', 'public.create_personal_tower(text)', 'execute')
  and not has_function_privilege(
    'anon',
    'public.save_personal_tower(uuid,text,jsonb,bigint)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.delete_personal_tower(uuid,bigint)',
    'execute'
  ),
  'anonymous role cannot execute private tower RPCs'
);
select ok(
  has_table_privilege('authenticated', 'public.personal_towers', 'select')
  and has_table_privilege('authenticated', 'public.personal_tower_items', 'select')
  and not has_table_privilege('authenticated', 'public.personal_towers', 'insert')
  and not has_table_privilege('authenticated', 'public.personal_tower_items', 'insert'),
  'authenticated role receives read-only table privileges'
);
select ok(
  has_function_privilege('authenticated', 'public.create_personal_tower(text)', 'execute')
  and has_function_privilege(
    'authenticated',
    'public.save_personal_tower(uuid,text,jsonb,bigint)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.delete_personal_tower(uuid,bigint)',
    'execute'
  ),
  'authenticated role can execute only the reviewed write surface'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.tower_test_ids (label, id)
    select 'sleep', id from public.create_personal_tower('Sleep better')
  $$,
  'user A can create a first goal tower'
);
select lives_ok(
  $$
    insert into pg_temp.tower_test_ids (label, id)
    select 'marathon', id from public.create_personal_tower('Run a marathon')
  $$,
  'user A can create a second goal tower'
);
select results_eq(
  $$ select count(*)::integer from public.personal_towers $$,
  array[2],
  'user A sees both owned towers'
);
select throws_ok(
  $$ insert into public.personal_towers (owner_id, title) values ('30000000-0000-4000-8000-000000000001', 'Direct write') $$,
  '42501',
  'permission denied for table personal_towers',
  'authenticated callers cannot write tables directly'
);

select lives_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Sleep deeply',
      '[
        {"protocol_id":"10000000-0000-4000-8000-000000000003","protocol_version":1,"position":1},
        {"protocol_id":"10000000-0000-4000-8000-000000000001","protocol_version":2,"position":2}
      ]'::jsonb,
      0
    )
  $$,
  'owner can atomically rename and populate a tower'
);
select results_eq(
  $$
    select title, revision
    from public.personal_towers
    where title = 'Sleep deeply'
  $$,
  $$ values ('Sleep deeply'::text, 1::bigint) $$,
  'save increments the optimistic revision'
);
select results_eq(
  $$
    select position
    from public.personal_tower_items
    where tower_id = (select id from pg_temp.tower_test_ids where label = 'sleep')
    order by position
  $$,
  array[1, 2],
  'owner reads contiguous pinned membership'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Stale title',
      '[]'::jsonb,
      0
    )
  $$,
  '40001',
  'Tower revision is stale.',
  'stale writes are rejected'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Duplicate input',
      '[
        {"protocol_id":"10000000-0000-4000-8000-000000000001","protocol_version":2,"position":1},
        {"protocol_id":"10000000-0000-4000-8000-000000000001","protocol_version":2,"position":2}
      ]'::jsonb,
      1
    )
  $$,
  '23505',
  'A protocol can appear only once in a tower.',
  'duplicate protocol identities are rejected'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Draft input',
      '[{"protocol_id":"10000000-0000-4000-8000-000000000003","protocol_version":2,"position":1}]'::jsonb,
      1
    )
  $$,
  '23503',
  'Protocol version is unavailable.',
  'unpublished protocol versions are rejected'
);
select throws_ok(
  $$ select * from public.create_personal_tower('Unsafe' || chr(10) || 'title') $$,
  '23514',
  'Tower title is invalid.',
  'control characters are rejected in private titles'
);
select throws_ok(
  $$ select * from public.create_personal_tower('Unsafe' || chr(8203) || 'title') $$,
  '23514',
  'Tower title is invalid.',
  'invisible Unicode format characters are rejected in private titles'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Unexpected shape',
      '[{
        "protocol_id":"10000000-0000-4000-8000-000000000001",
        "protocol_version":2,
        "position":1,
        "notes":"not allowed"
      }]'::jsonb,
      1
    )
  $$,
  '23514',
  'Tower items are invalid.',
  'unreviewed item fields are rejected'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Too many items',
      (
        select jsonb_agg(
          jsonb_build_object(
            'protocol_id', '10000000-0000-4000-8000-000000000001',
            'protocol_version', 2,
            'position', position
          )
        )
        from generate_series(1, 21) as position
      ),
      1
    )
  $$,
  '23514',
  'Tower input is invalid.',
  'tower membership is capped at twenty items'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$
    insert into pg_temp.tower_test_ids (label, id)
    select 'user-b', id from public.create_personal_tower('User B tower')
  $$,
  'user B can create an independent tower'
);
select results_eq(
  $$ select count(*)::integer from public.personal_towers $$,
  array[1],
  'user B cannot read user A towers'
);
select results_eq(
  $$ select count(*)::integer from public.personal_tower_items $$,
  array[0],
  'user B cannot read user A tower items'
);
select throws_ok(
  $$
    select *
    from public.save_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      'Cross-user update',
      '[]'::jsonb,
      1
    )
  $$,
  'P0002',
  'Tower was not found.',
  'user B receives no ownership oracle when attempting to save user A tower'
);
select results_eq(
  $$
    select public.delete_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      1
    )
  $$,
  array[false],
  'user B cannot delete user A tower'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.create_personal_tower('No session') $$,
  '42501',
  'Authentication is required.',
  'an authenticated database role without a verified user session is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select *
    from public.delete_personal_tower(
      (select id from pg_temp.tower_test_ids where label = 'sleep'),
      1
    )
  $$,
  'owner can delete one revision-matched tower'
);
select results_eq(
  $$ select count(*)::integer from public.personal_tower_items $$,
  array[0],
  'tower deletion cascades to its items'
);
select results_eq(
  $$
    select count(*)::integer
    from generate_series(1, 11) as sequence_number
    cross join lateral public.create_personal_tower(
      'Limit tower ' || sequence_number::text
    )
  $$,
  array[11],
  'owner can create towers up to the twelve-tower limit'
);
select throws_ok(
  $$ select * from public.create_personal_tower('Thirteenth tower') $$,
  '23514',
  'Tower limit reached.',
  'a thirteenth tower is rejected atomically'
);

reset role;
delete from auth.users where id = '30000000-0000-4000-8000-000000000001';
select results_eq(
  $$
    select count(*)::integer
    from public.personal_towers
    where owner_id = '30000000-0000-4000-8000-000000000001'
  $$,
  array[0],
  'Auth user deletion cascades to all remaining owned towers'
);
select results_eq(
  $$
    select count(*)::integer
    from public.personal_towers
    where owner_id = '30000000-0000-4000-8000-000000000002'
  $$,
  array[1],
  'deleting user A does not affect user B towers'
);

select * from finish();
rollback;
