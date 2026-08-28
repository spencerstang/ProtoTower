begin;
select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'profile-alpha@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'profile-beta@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

select has_table('public', 'account_profiles', 'account profiles table exists');
select col_is_pk('public', 'account_profiles', 'owner_id', 'owner id is the primary key');
select has_function('public', 'save_account_pseudonym', array['text', 'bigint'], 'save RPC exists');
select results_eq(
  $$ select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.account_profiles'::regclass $$,
  $$ values (true, true) $$,
  'account profiles enable and force RLS'
);
select results_eq(
  $$ select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'account_profiles' $$,
  array[1],
  'only the reviewed owner-read policy exists'
);
select ok(not has_table_privilege('anon', 'public.account_profiles', 'select'), 'anonymous role cannot read profiles');
select ok(not has_function_privilege('anon', 'public.save_account_pseudonym(text,bigint)', 'execute'), 'anonymous role cannot save profiles');
select ok(has_table_privilege('authenticated', 'public.account_profiles', 'select'), 'authenticated role can read its profile');
select ok(not has_table_privilege('authenticated', 'public.account_profiles', 'insert'), 'authenticated role cannot write profiles directly');
select ok(has_function_privilege('authenticated', 'public.save_account_pseudonym(text,bigint)', 'execute'), 'authenticated role can use the save RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

select lives_ok($$ select * from public.save_account_pseudonym('Radiant Lynx', null) $$, 'owner can create a profile');
select results_eq($$ select pseudonym, revision from public.account_profiles $$, $$ values ('Radiant Lynx'::text, 0::bigint) $$, 'owner reads the created profile');
select lives_ok($$ select * from public.save_account_pseudonym('Quiet Forge', 0) $$, 'owner can update the pseudonym');
select results_eq($$ select pseudonym, revision from public.account_profiles $$, $$ values ('Quiet Forge'::text, 1::bigint) $$, 'update increments the revision');
select throws_ok($$ select * from public.save_account_pseudonym('Stale Comet', 0) $$, '40001', 'Account profile revision is stale.', 'stale updates fail');
select throws_ok($$ select * from public.save_account_pseudonym('Admin', 1) $$, '23514', 'Pseudonym input is invalid.', 'reserved pseudonyms fail');
select throws_ok($$ insert into public.account_profiles (owner_id, pseudonym) values ('60000000-0000-4000-8000-000000000001', 'Direct Write') $$, '42501', 'permission denied for table account_profiles', 'direct writes fail');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select results_eq($$ select count(*)::integer from public.account_profiles $$, array[0], 'another owner cannot read the profile');
select throws_ok($$ select * from public.save_account_pseudonym('Beta Forge', 0) $$, '40001', 'Account profile revision is stale.', 'a missing profile rejects an update revision');
select lives_ok($$ select * from public.save_account_pseudonym('Beta Forge', null) $$, 'another owner creates an independent profile');

select * from finish();
rollback;
