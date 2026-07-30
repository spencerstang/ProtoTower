begin;

create table public.protocols (
  id uuid primary key,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint protocols_slug_format check (
    slug = lower(slug)
    and length(slug) between 3 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint protocols_status_known check (status in ('active', 'retired'))
);

comment on table public.protocols is
  'Provider-neutral protocol identities. Anonymous reads are limited by row-level security.';
comment on column public.protocols.status is
  'Catalog visibility state. Retired protocols are not anonymously readable.';

create or replace function app_private.protocol_steps_are_valid(payload jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  item jsonb;
  expected_position integer := 1;
  normalized_title text;
  seen_titles text[] := array[]::text[];
begin
  if jsonb_typeof(payload) <> 'array'
    or jsonb_array_length(payload) < 1
    or jsonb_array_length(payload) > 20 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['position', 'title', 'description']
      or item - array['position', 'title', 'description'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'position') <> 'number'
      or (item ->> 'position') !~ '^[1-9][0-9]*$'
      or (item ->> 'position')::numeric <> expected_position
      or jsonb_typeof(item -> 'title') <> 'string'
      or length(btrim(item ->> 'title')) not between 1 and 120
      or jsonb_typeof(item -> 'description') <> 'string'
      or length(btrim(item ->> 'description')) not between 1 and 1000 then
      return false;
    end if;

    normalized_title := lower(btrim(item ->> 'title'));
    if normalized_title = any(seen_titles) then
      return false;
    end if;

    seen_titles := array_append(seen_titles, normalized_title);
    expected_position := expected_position + 1;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function app_private.protocol_cautions_are_valid(payload jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  item jsonb;
  normalized_caution text;
  seen_cautions text[] := array[]::text[];
begin
  if jsonb_typeof(payload) <> 'array'
    or jsonb_array_length(payload) < 1
    or jsonb_array_length(payload) > 20 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(item) <> 'string'
      or length(btrim(item #>> '{}')) not between 1 and 500 then
      return false;
    end if;

    normalized_caution := lower(btrim(item #>> '{}'));
    if normalized_caution = any(seen_cautions) then
      return false;
    end if;

    seen_cautions := array_append(seen_cautions, normalized_caution);
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function app_private.protocol_references_are_valid(payload jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(payload) <> 'array'
    or jsonb_array_length(payload) > 20 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['label', 'url']
      or item - array['label', 'url'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'label') <> 'string'
      or length(btrim(item ->> 'label')) not between 1 and 160
      or jsonb_typeof(item -> 'url') <> 'string'
      or (item ->> 'url') !~ '^https://[^[:space:]]+$' then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

create table public.protocol_versions (
  protocol_id uuid not null references public.protocols (id) on delete cascade,
  version integer not null,
  title text not null,
  summary text not null,
  overview text not null,
  steps jsonb not null,
  cautions jsonb not null,
  reference_links jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (protocol_id, version),
  constraint protocol_versions_version_positive check (version > 0),
  constraint protocol_versions_title_valid check (length(btrim(title)) between 1 and 140),
  constraint protocol_versions_summary_valid check (length(btrim(summary)) between 1 and 500),
  constraint protocol_versions_overview_valid check (length(btrim(overview)) between 1 and 4000),
  constraint protocol_versions_steps_valid check (
    app_private.protocol_steps_are_valid(steps)
  ),
  constraint protocol_versions_cautions_valid check (
    app_private.protocol_cautions_are_valid(cautions)
  ),
  constraint protocol_versions_references_valid check (
    app_private.protocol_references_are_valid(reference_links)
  )
);

comment on table public.protocol_versions is
  'Versioned synthetic educational protocol content. Rows become immutable when published_at is set.';
comment on column public.protocol_versions.published_at is
  'A non-null value marks an immutable version visible through the read-only catalog.';

create index protocol_versions_latest_published_idx
  on public.protocol_versions (protocol_id, version desc)
  where published_at is not null;

create or replace function app_private.prevent_published_protocol_version_changes()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.published_at is not null then
    raise exception 'Published protocol versions are immutable.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger protocol_versions_published_immutable
before update or delete on public.protocol_versions
for each row
execute function app_private.prevent_published_protocol_version_changes();

create or replace function app_private.protocol_has_published_version(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.protocol_versions
    where protocol_id = candidate_id
      and published_at is not null
  );
$$;

create or replace function app_private.protocol_is_active(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.protocols
    where id = candidate_id
      and status = 'active'
  );
$$;

alter table public.protocols enable row level security;
alter table public.protocols force row level security;
alter table public.protocol_versions enable row level security;
alter table public.protocol_versions force row level security;

create policy protocols_read_active_published
on public.protocols
for select
to anon, authenticated
using (
  status = 'active'
  and app_private.protocol_has_published_version(id)
);

create policy protocol_versions_read_published_active
on public.protocol_versions
for select
to anon, authenticated
using (
  published_at is not null
  and app_private.protocol_is_active(protocol_id)
);

create view public.published_protocol_catalog
with (security_invoker = true)
as
select distinct on (protocol.id)
  protocol.id,
  protocol.slug,
  protocol_version.version,
  protocol_version.title,
  protocol_version.summary,
  protocol_version.overview,
  protocol_version.steps,
  protocol_version.cautions,
  protocol_version.reference_links,
  protocol_version.published_at
from public.protocols as protocol
join public.protocol_versions as protocol_version
  on protocol_version.protocol_id = protocol.id
where protocol.status = 'active'
  and protocol_version.published_at is not null
order by protocol.id, protocol_version.version desc;

comment on view public.published_protocol_catalog is
  'Latest immutable published version for each anonymously visible active protocol.';

revoke all on table public.protocols from public, anon, authenticated;
revoke all on table public.protocol_versions from public, anon, authenticated;
revoke all on table public.published_protocol_catalog from public, anon, authenticated;

grant select on table public.protocols to anon, authenticated;
grant select on table public.protocol_versions to anon, authenticated;
grant select on table public.published_protocol_catalog to anon, authenticated;
grant select, insert, update, delete on table public.protocols to postgres, service_role;
grant select, insert, update, delete on table public.protocol_versions to postgres, service_role;
grant select on table public.published_protocol_catalog to postgres, service_role;

revoke all on function app_private.protocol_steps_are_valid(jsonb) from public;
revoke all on function app_private.protocol_cautions_are_valid(jsonb) from public;
revoke all on function app_private.protocol_references_are_valid(jsonb) from public;
revoke all on function app_private.prevent_published_protocol_version_changes() from public;
revoke all on function app_private.protocol_has_published_version(uuid) from public;
revoke all on function app_private.protocol_is_active(uuid) from public;

grant execute on function app_private.protocol_steps_are_valid(jsonb) to postgres, service_role;
grant execute on function app_private.protocol_cautions_are_valid(jsonb) to postgres, service_role;
grant execute on function app_private.protocol_references_are_valid(jsonb) to postgres, service_role;
grant execute on function app_private.prevent_published_protocol_version_changes()
  to postgres, service_role;
grant execute on function app_private.protocol_has_published_version(uuid)
  to postgres, service_role, anon, authenticated;
grant execute on function app_private.protocol_is_active(uuid)
  to postgres, service_role, anon, authenticated;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 2, "product_schema": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
