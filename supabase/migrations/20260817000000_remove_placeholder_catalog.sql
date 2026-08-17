begin;

-- These fixed identifiers belong exclusively to the original development catalog.
-- Production must remain empty until reviewed protocol content is published through
-- an approved content workflow.
delete from public.personal_tower_items
where protocol_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

drop trigger protocol_versions_published_immutable on public.protocol_versions;

delete from public.protocols
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

create trigger protocol_versions_published_immutable
before update or delete on public.protocol_versions
for each row
execute function app_private.prevent_published_protocol_version_changes();

delete from app_private.platform_metadata
where key = 'synthetic_seed';

comment on table public.protocol_versions is
  'Versioned educational protocol content. Rows become immutable when published_at is set.';

commit;
