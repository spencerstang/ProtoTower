begin;

-- Owner-approved compatibility cleanup for staging records created against the
-- original synthetic catalog. The following fixed identifiers were reserved for
-- development fixtures and are retired by the immediately following migration.
-- Recording only an aggregate count preserves evidence without retaining private
-- practice dates, account identifiers, or obsolete protocol references.
insert into app_private.platform_metadata (key, value)
select
  'retired_synthetic_practice_data',
  jsonb_build_object(
    'protocol_count', 4,
    'checkin_count', count(*),
    'approved_on', '2026-08-29',
    'contains_user_data', false
  )
from public.protocol_practice_checkins
where protocol_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

delete from public.protocol_practice_checkins
where protocol_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

commit;
