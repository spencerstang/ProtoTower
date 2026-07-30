begin;
select plan(18);

select results_eq(
  $$ select (value ->> 'milestone')::integer from app_private.platform_metadata where key = 'schema_stage' $$,
  array[2],
  'schema metadata records Milestone 2'
);

select has_table('public', 'protocols', 'protocol identity table exists');
select has_table('public', 'protocol_versions', 'protocol version table exists');
select has_view('public', 'published_protocol_catalog', 'published catalog view exists');
select col_is_pk('public', 'protocols', 'id', 'protocol id is the primary key');
select col_is_pk(
  'public',
  'protocol_versions',
  array['protocol_id', 'version'],
  'protocol version identity is a composite primary key'
);

select results_eq(
  $$
    select
      count(*) = 9
      and count(*) filter (
        where conname in (
          'protocol_versions_cautions_valid',
          'protocol_versions_overview_valid',
          'protocol_versions_references_valid',
          'protocol_versions_steps_valid',
          'protocol_versions_summary_valid',
          'protocol_versions_title_valid',
          'protocol_versions_version_positive',
          'protocols_slug_format',
          'protocols_status_known'
        )
      ) = 9
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid in ('public.protocols'::regclass, 'public.protocol_versions'::regclass)
      and contype = 'c'
  $$,
  array[true],
  'catalog tables enforce every declared content constraint'
);

select results_eq(
  $$
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'public.protocols'::regclass
  $$,
  $$ values (true, true) $$,
  'protocol identities enable and force row-level security'
);

select results_eq(
  $$
    select relrowsecurity, relforcerowsecurity
    from pg_class
    where oid = 'public.protocol_versions'::regclass
  $$,
  $$ values (true, true) $$,
  'protocol versions enable and force row-level security'
);

select results_eq(
  $$
    select
      count(*) = 2
      and count(*) filter (
        where policyname in (
          'protocol_versions_read_published_active',
          'protocols_read_active_published'
        )
      ) = 2
    from pg_policies
    where schemaname = 'public'
      and tablename in ('protocols', 'protocol_versions')
  $$,
  array[true],
  'catalog tables expose only the two reviewed read policies'
);

set local role anon;

select results_eq(
  $$ select count(*)::integer from public.published_protocol_catalog $$,
  array[3],
  'anonymous visitors see one catalog row for each active published protocol'
);

select results_eq(
  $$ select version from public.published_protocol_catalog where slug = 'morning-light-routine' $$,
  array[2],
  'the anonymous catalog selects the latest published version'
);

select results_eq(
  $$
    select count(*)::integer
    from public.protocol_versions
    where protocol_id = '10000000-0000-4000-8000-000000000003'
      and version = 2
  $$,
  array[0],
  'anonymous visitors cannot read an unpublished draft'
);

select results_eq(
  $$
    select count(*)::integer
    from public.protocols
    where id = '10000000-0000-4000-8000-000000000004'
  $$,
  array[0],
  'anonymous visitors cannot read a retired protocol'
);

select throws_ok(
  $$
    insert into public.protocols (id, slug, status)
    values ('10000000-0000-4000-8000-000000000099', 'anonymous-write', 'active')
  $$,
  '42501',
  'permission denied for table protocols',
  'anonymous visitors cannot create protocols'
);

reset role;

select throws_ok(
  $$
    update public.protocol_versions
    set title = 'Changed after publication'
    where protocol_id = '10000000-0000-4000-8000-000000000001'
      and version = 2
  $$,
  '55000',
  'Published protocol versions are immutable.',
  'published versions cannot be updated'
);

select throws_ok(
  $$
    delete from public.protocol_versions
    where protocol_id = '10000000-0000-4000-8000-000000000001'
      and version = 1
  $$,
  '55000',
  'Published protocol versions are immutable.',
  'published versions cannot be deleted'
);

select lives_ok(
  $$
    update public.protocol_versions
    set title = 'Editable synthetic draft'
    where protocol_id = '10000000-0000-4000-8000-000000000003'
      and version = 2
  $$,
  'unpublished drafts remain editable through privileged tooling'
);

select * from finish();
rollback;
