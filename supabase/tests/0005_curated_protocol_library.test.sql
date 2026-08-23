begin;
select plan(8);

select results_eq(
  $$ select count(*)::integer from public.protocols where id::text like '20000000-%' $$,
  array[4],
  'the curated protocol library has four stable identities'
);

select results_eq(
  $$ select count(*)::integer from public.protocol_versions where protocol_id::text like '20000000-%' and published_at is not null $$,
  array[4],
  'every curated protocol has one published immutable version'
);

select results_eq(
  $$ select count(*)::integer from public.protocol_versions where protocol_id::text like '20000000-%' and jsonb_array_length(steps) between 5 and 6 $$,
  array[4],
  'curated protocols contain the reviewed five-to-six-step plans'
);

select results_eq(
  $$ select count(*)::integer from public.protocol_versions where protocol_id::text like '20000000-%' and jsonb_array_length(cautions) >= 3 $$,
  array[4],
  'every curated protocol carries explicit cautions'
);

select results_eq(
  $$ select count(*)::integer from public.protocol_versions where protocol_id::text like '20000000-%' and jsonb_array_length(reference_links) >= 2 $$,
  array[4],
  'every curated protocol includes expert and independent evidence references'
);

select results_eq(
  $$ select count(*)::integer from public.protocol_versions where protocol_id::text like '20000000-%' and overview like '%Independent evidence tier:%' $$,
  array[4],
  'expert recommendations remain separate from independent evidence tiers'
);

set local role anon;

select results_eq(
  $$ select count(*)::integer from public.published_protocol_catalog where id::text like '20000000-%' $$,
  array[4],
  'anonymous catalog readers can see all four curated protocols'
);

select results_eq(
  $$ select count(*)::integer from public.published_protocol_catalog where id::text like '20000000-%' and reference_links::text !~ 'http://' $$,
  array[4],
  'curated public references use HTTPS only'
);

select * from finish();
rollback;
