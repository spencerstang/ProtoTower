begin;

create or replace function app_private.tower_title_is_valid(candidate text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select
    candidate = btrim(candidate)
    and candidate = normalize(candidate, NFC)
    and char_length(candidate) between 1 and 80
    and candidate !~ '[[:cntrl:]]'
    and candidate !~ '[[:space:]]{2,}'
    and not exists (
      select 1
      from (
        values
          (173, 173),
          (1536, 1541),
          (1564, 1564),
          (1757, 1757),
          (1807, 1807),
          (2192, 2193),
          (2274, 2274),
          (6158, 6158),
          (8203, 8207),
          (8234, 8238),
          (8288, 8292),
          (8294, 8303),
          (65279, 65279),
          (65529, 65531),
          (69821, 69821),
          (69837, 69837),
          (78896, 78933),
          (113824, 113827),
          (119155, 119162),
          (917505, 917505),
          (917536, 917631)
      ) as format_ranges(first_codepoint, last_codepoint)
      cross join lateral generate_series(first_codepoint, last_codepoint) as format_codepoint
      where strpos(candidate, chr(format_codepoint)) > 0
    )
$$;

create table public.personal_towers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_towers_title_valid check (app_private.tower_title_is_valid(title)),
  constraint personal_towers_revision_nonnegative check (revision >= 0)
);

comment on table public.personal_towers is
  'Private goal-specific protocol towers. Email and profile data remain in Supabase Auth.';
comment on column public.personal_towers.owner_id is
  'Supabase Auth owner. Caller-supplied owner identifiers are never accepted by write RPCs.';
comment on column public.personal_towers.title is
  'Private normalized plain-text goal label; never public catalog content.';
comment on column public.personal_towers.revision is
  'Optimistic concurrency token incremented by every successful save.';

create index personal_towers_owner_updated_idx
  on public.personal_towers (owner_id, updated_at desc, id);

create table public.personal_tower_items (
  tower_id uuid not null references public.personal_towers (id) on delete cascade,
  protocol_id uuid not null,
  protocol_version integer not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (tower_id, protocol_id),
  constraint personal_tower_items_position_unique unique (tower_id, position),
  constraint personal_tower_items_position_valid check (position between 1 and 20),
  constraint personal_tower_items_version_positive check (protocol_version > 0),
  constraint personal_tower_items_protocol_version_fkey
    foreign key (protocol_id, protocol_version)
    references public.protocol_versions (protocol_id, version)
);

comment on table public.personal_tower_items is
  'Private ordered references to exact immutable protocol versions.';

alter table public.personal_towers enable row level security;
alter table public.personal_towers force row level security;
alter table public.personal_tower_items enable row level security;
alter table public.personal_tower_items force row level security;

create or replace function app_private.tower_is_owned(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.personal_towers
    where id = candidate_id
      and owner_id = (select auth.uid())
  )
$$;

create policy personal_towers_read_own
on public.personal_towers
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy personal_tower_items_read_own
on public.personal_tower_items
for select
to authenticated
using ((select app_private.tower_is_owned(tower_id)));

revoke all on table public.personal_towers from public, anon, authenticated;
revoke all on table public.personal_tower_items from public, anon, authenticated;

grant select on table public.personal_towers to authenticated;
grant select on table public.personal_tower_items to authenticated;
grant select, insert, update, delete on table public.personal_towers to postgres, service_role;
grant select, insert, update, delete on table public.personal_tower_items to postgres, service_role;

create or replace function public.create_personal_tower(candidate_title text)
returns table (
  id uuid,
  title text,
  revision bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  created_tower public.personal_towers%rowtype;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if not app_private.tower_title_is_valid(candidate_title) then
    raise check_violation using message = 'Tower title is invalid.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 0));

  if (select count(*) from public.personal_towers where owner_id = current_owner) >= 12 then
    raise check_violation using message = 'Tower limit reached.';
  end if;

  insert into public.personal_towers (owner_id, title)
  values (current_owner, candidate_title)
  returning * into created_tower;

  return query
  select
    created_tower.id,
    created_tower.title,
    created_tower.revision,
    created_tower.created_at,
    created_tower.updated_at;
end;
$$;

create or replace function public.save_personal_tower(
  candidate_id uuid,
  candidate_title text,
  candidate_items jsonb,
  expected_revision bigint
)
returns table (
  id uuid,
  title text,
  revision bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_tower public.personal_towers%rowtype;
  saved_tower public.personal_towers%rowtype;
  item jsonb;
  expected_position integer := 1;
  parsed_protocol_id uuid;
  parsed_protocol_version integer;
  seen_protocol_ids uuid[] := array[]::uuid[];
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if candidate_id is null
    or expected_revision is null
    or expected_revision < 0
    or not app_private.tower_title_is_valid(candidate_title)
    or candidate_items is null
    or jsonb_typeof(candidate_items) <> 'array'
    or jsonb_array_length(candidate_items) > 20 then
    raise check_violation using message = 'Tower input is invalid.';
  end if;

  select *
  into current_tower
  from public.personal_towers
  where personal_towers.id = candidate_id
    and personal_towers.owner_id = current_owner
  for update;

  if not found then
    raise no_data_found using message = 'Tower was not found.';
  end if;

  if current_tower.revision <> expected_revision then
    raise serialization_failure using message = 'Tower revision is stale.';
  end if;

  for item in select value from jsonb_array_elements(candidate_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ?& array['protocol_id', 'protocol_version', 'position']
      or item - array['protocol_id', 'protocol_version', 'position'] <> '{}'::jsonb
      or jsonb_typeof(item -> 'protocol_id') <> 'string'
      or jsonb_typeof(item -> 'protocol_version') <> 'number'
      or (item ->> 'protocol_version') !~ '^[1-9][0-9]*$'
      or jsonb_typeof(item -> 'position') <> 'number'
      or (item ->> 'position') !~ '^[1-9][0-9]*$'
      or (item ->> 'position')::integer <> expected_position then
      raise check_violation using message = 'Tower items are invalid.';
    end if;

    begin
      parsed_protocol_id := (item ->> 'protocol_id')::uuid;
      parsed_protocol_version := (item ->> 'protocol_version')::integer;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise check_violation using message = 'Tower items are invalid.';
    end;

    if parsed_protocol_id = any(seen_protocol_ids) then
      raise unique_violation using message = 'A protocol can appear only once in a tower.';
    end if;

    if not exists (
      select 1
      from public.protocols
      join public.protocol_versions
        on protocol_versions.protocol_id = protocols.id
      where protocols.id = parsed_protocol_id
        and protocols.status = 'active'
        and protocol_versions.version = parsed_protocol_version
        and protocol_versions.published_at is not null
    ) then
      raise foreign_key_violation using message = 'Protocol version is unavailable.';
    end if;

    seen_protocol_ids := array_append(seen_protocol_ids, parsed_protocol_id);
    expected_position := expected_position + 1;
  end loop;

  delete from public.personal_tower_items
  where tower_id = candidate_id;

  insert into public.personal_tower_items (
    tower_id,
    protocol_id,
    protocol_version,
    position
  )
  select
    candidate_id,
    (value ->> 'protocol_id')::uuid,
    (value ->> 'protocol_version')::integer,
    (value ->> 'position')::integer
  from jsonb_array_elements(candidate_items);

  update public.personal_towers
  set title = candidate_title,
      revision = personal_towers.revision + 1,
      updated_at = clock_timestamp()
  where personal_towers.id = candidate_id
  returning * into saved_tower;

  return query
  select
    saved_tower.id,
    saved_tower.title,
    saved_tower.revision,
    saved_tower.created_at,
    saved_tower.updated_at;
end;
$$;

create or replace function public.delete_personal_tower(
  candidate_id uuid,
  expected_revision bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
as $$
declare
  current_owner uuid := (select auth.uid());
  current_revision bigint;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if candidate_id is null or expected_revision is null or expected_revision < 0 then
    raise check_violation using message = 'Tower input is invalid.';
  end if;

  select revision
  into current_revision
  from public.personal_towers
  where id = candidate_id
    and owner_id = current_owner
  for update;

  if not found then
    return false;
  end if;

  if current_revision <> expected_revision then
    raise serialization_failure using message = 'Tower revision is stale.';
  end if;

  delete from public.personal_towers
  where id = candidate_id
    and owner_id = current_owner;

  return found;
end;
$$;

revoke all on function app_private.tower_title_is_valid(text) from public;
revoke all on function app_private.tower_is_owned(uuid) from public;
revoke all on function public.create_personal_tower(text) from public, anon;
revoke all on function public.save_personal_tower(uuid, text, jsonb, bigint) from public, anon;
revoke all on function public.delete_personal_tower(uuid, bigint) from public, anon;

grant execute on function app_private.tower_title_is_valid(text)
  to postgres, service_role;
grant execute on function app_private.tower_is_owned(uuid)
  to postgres, service_role, authenticated;
grant execute on function public.create_personal_tower(text)
  to postgres, service_role, authenticated;
grant execute on function public.save_personal_tower(uuid, text, jsonb, bigint)
  to postgres, service_role, authenticated;
grant execute on function public.delete_personal_tower(uuid, bigint)
  to postgres, service_role, authenticated;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 3, "product_schema": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
