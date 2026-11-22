begin;
select plan(6);
-- Synthetic measure definitions and readings only.
select ok(app_private.metric_preset_matches('sleep-quality','ongoing','rating'),'quality is a rating');
select ok(not app_private.metric_preset_matches('sleep-quality','proxy','hours'),'quality cannot be stored as duration');
create temporary table quality_ids(id uuid);
grant select,insert on quality_ids to authenticated;
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
    '36000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'quality-alpha@example.test',
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
    '36000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'quality-beta@example.test',
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
select set_config('request.jwt.claim.sub','36000000-0000-4000-8000-000000000001',true);
select lives_ok($test$
insert into quality_ids select id from public.create_configured_personal_tower('Synthetic sleep goal',null,'weekly','{}','private','named',
'[{"title":"Synthetic practice","how_to":"Follow synthetic instructions.","source_protocol_id":null,"source_protocol_version":null}]',
'[{"kind":"final","shape":"complete_incomplete","label":"Goal complete","preset_key":"goal-complete"},{"kind":"ongoing","shape":"rating","label":"Subjective sleep quality","preset_key":"sleep-quality"}]');
$test$,'quality preset saves through the standard setup RPC');
create function pg_temp.record_quality(score text) returns uuid language sql as $fn$
select public.record_tower_checkin((select id from quality_ids),date_trunc('week',now() at time zone 'utc')::date,
(select jsonb_agg(jsonb_build_object('metric_id',id,'skipped',false,'numeric_value',case when kind='ongoing' then score else null end,'secondary_numeric',null,'text_value',null,'completion',case when kind='final' then 'complete' else null end)) from public.tower_metrics where tower_id=(select id from quality_ids)),'[]');
$fn$;
select lives_ok($test$select pg_temp.record_quality('5')$test$,'excellent quality saves as five');
select throws_ok($test$select pg_temp.record_quality('6')$test$,'23514','Check-in input is invalid.','quality outside the displayed scale is rejected');
select results_eq($test$select r.numeric_value from public.tower_checkin_responses r join public.tower_metrics m on m.id=r.metric_id where m.preset_key='sleep-quality'$test$,array['5'::text],'invalid input does not alter the saved quality rating');
select * from finish();
rollback;
