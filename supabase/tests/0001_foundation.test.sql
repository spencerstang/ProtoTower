begin;
select plan(4);

select has_schema('app_private', 'app_private schema exists');
select has_table('app_private', 'platform_metadata', 'foundation metadata table exists');
select col_is_pk('app_private', 'platform_metadata', 'key', 'metadata key is the primary key');
select results_eq(
  $$ select (value ->> 'milestone')::integer >= 1 from app_private.platform_metadata where key = 'schema_stage' $$,
  array[true],
  'foundation metadata retains a valid milestone number'
);

select * from finish();
rollback;
