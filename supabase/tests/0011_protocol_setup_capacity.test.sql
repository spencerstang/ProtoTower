begin;
select plan(8);
-- Synthetic fixtures; no production records are used.
create temporary table capacity_ids (label text, id uuid);
grant select, insert on capacity_ids to authenticated;
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
    '35000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'capacity-alpha@example.test',
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
    '35000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'capacity-beta@example.test',
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
select set_config('request.jwt.claim.sub','35000000-0000-4000-8000-000000000001',true);
create function pg_temp.capacity_protocols(n integer) returns jsonb language sql as $fn$
select jsonb_agg(jsonb_build_object('title','Synthetic practice '||i,'how_to','Follow synthetic instructions.','source_protocol_id',null,'source_protocol_version',null) order by i) from generate_series(1,n) as i;
$fn$;
create function pg_temp.capacity_metrics() returns jsonb language sql as $fn$
select '[{"kind":"final","shape":"complete_incomplete","label":"Goal complete","preset_key":"goal-complete"}]'::jsonb;
$fn$;
create function pg_temp.create_capacity(n integer) returns uuid language sql as $fn$
select id from public.create_configured_personal_tower('Synthetic capacity goal',null,'weekly','{}','private','named',pg_temp.capacity_protocols(n),pg_temp.capacity_metrics());
$fn$;
select lives_ok($test$insert into capacity_ids values ('four', pg_temp.create_capacity(4))$test$, 'four protocols save during creation');
select results_eq($test$select count(*)::integer from public.tower_protocols where tower_id=(select id from capacity_ids where label='four')$test$, array[4], 'all four protocols persist');
select lives_ok($test$insert into capacity_ids values ('twenty', pg_temp.create_capacity(20))$test$, 'twenty protocols save during creation');
select results_eq($test$select count(*)::integer from public.tower_protocols where tower_id=(select id from capacity_ids where label='twenty')$test$, array[20], 'all twenty protocols persist');
select throws_ok($test$select pg_temp.create_capacity(21)$test$, '23514', 'Tower setup is invalid.', 'twenty-one protocols are rejected during creation');
create function pg_temp.save_capacity(n integer) returns void language sql as $fn$
select public.save_tower_setup(t.id,t.revision,t.title,t.definition,t.cadence,t.custom_dates,t.audience,t.identity_mode,pg_temp.capacity_protocols(n),pg_temp.capacity_metrics()) from public.personal_towers t where t.id=(select id from capacity_ids where label='four');
$fn$;
select lives_ok($test$select pg_temp.save_capacity(20)$test$, 'existing tower setup accepts twenty protocols');
select throws_ok($test$select pg_temp.save_capacity(21)$test$, '23514', 'Tower setup is invalid.', 'existing tower setup rejects twenty-one protocols');
select results_eq($test$select count(*)::integer from public.tower_protocols where tower_id=(select id from capacity_ids where label='four')$test$, array[20], 'failed overflow leaves saved setup unchanged');
select * from finish();
rollback;
