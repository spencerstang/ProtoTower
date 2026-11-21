begin;
select plan(13);
create temporary table measure_test_ids (id uuid);
grant select, insert on measure_test_ids to authenticated;
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
    '32000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'measure-alpha@example.test',
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
    '32000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'measure-beta@example.test',
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
select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000001', true);
select lives_ok($test$
insert into pg_temp.measure_test_ids select id from public.create_configured_personal_tower(
'Synthetic measurement goal', null, 'weekly', '{}', 'private', 'named',
'[{"title":"First practice","how_to":"Do the first practice.","source_protocol_id":null,"source_protocol_version":null},{"title":"Second practice","how_to":"Do the second practice.","source_protocol_id":null,"source_protocol_version":null}]',
'[{"kind":"final","shape":"number","label":"Concentration","preset_key":null,"unit":"units/mL"},{"kind":"ongoing","shape":"text","label":"Observation","preset_key":null}]'
); $test$, 'one goal, two protocols, and a generic outcome save');
select results_eq($test$select unit from public.tower_metrics where tower_id=(select id from measure_test_ids) and shape='number'$test$, array['units/mL'::text], 'numeric unit persists');

create function pg_temp.record_measurement(reading text, measured text) returns uuid language sql as $fn$
select public.record_tower_checkin((select id from pg_temp.measure_test_ids), date_trunc('week',now() at time zone 'utc')::date,
(select jsonb_agg(jsonb_build_object('metric_id',id,'skipped',false,'numeric_value',case when shape='number' then reading else null end,'secondary_numeric',null,'text_value',case when shape='text' then 'Synthetic observation' else null end,'completion',null,'measured_on',measured)) from public.tower_metrics where tower_id=(select id from pg_temp.measure_test_ids)), '[]');
$fn$;
select lives_ok($test$select pg_temp.record_measurement('3.250000','2020-02-03')$test$, 'decimal and text observations save');
select lives_ok($test$select pg_temp.record_measurement('0','2020-02-04')$test$, 'another date saves in the same check-in period');
select results_eq($test$select count(*)::integer from public.tower_measurement_observations$test$, array[4], 'two measures on two dates remain in history');
select results_eq($test$select numeric_value from public.tower_measurement_observations where measured_on='2020-02-03' and numeric_value is not null$test$, array['3.250000'::text], 'decimal precision is exact');
select lives_ok($test$select pg_temp.record_measurement('-0.125','2020-02-03')$test$, 'correction for the same date updates the reading');
select results_eq($test$select count(*)::integer from public.tower_measurement_observations$test$, array[4], 'correction does not duplicate observations');
select throws_ok($test$select pg_temp.record_measurement('1e3','2020-02-03')$test$, '23514', 'Check-in input is invalid.', 'exponential numeric input is rejected');
select throws_ok($test$select pg_temp.record_measurement('1','2999-01-01')$test$, '23514', 'Measurement date is invalid.', 'future measurements are rejected');
select results_eq($test$select numeric_value from public.tower_measurement_observations where measured_on='2020-02-03' and numeric_value is not null$test$, array['-0.125'::text], 'invalid submissions leave history unchanged');
select ok(not has_table_privilege('anon','public.tower_measurement_observations','select') and not has_table_privilege('authenticated','public.tower_measurement_observations','insert'), 'anonymous reads and direct authenticated writes are denied');
select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000002', true);
select results_eq($test$select count(*)::integer from public.tower_measurement_observations$test$, array[0], 'another owner cannot read observations');
select * from finish();
rollback;
