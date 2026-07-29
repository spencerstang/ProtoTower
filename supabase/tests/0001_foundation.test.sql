begin;
select plan(4);

select has_schema('app_private', 'app_private schema exists');
select has_table('app_private', 'platform_metadata', 'foundation metadata table exists');
select col_is_pk('app_private', 'platform_metadata', 'key', 'metadata key is the primary key');
select results_eq(
  $$ select (value ->> 'milestone')::integer from app_private.platform_metadata where key = 'schema_stage' $$,
  array[1],
  'foundation migration records Milestone 1'
);

select * from finish();
rollback;
