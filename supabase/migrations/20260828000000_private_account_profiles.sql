begin;

create or replace function app_private.pseudonym_is_valid(candidate text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select
    candidate = btrim(candidate)
    and candidate = normalize(candidate, NFC)
    and char_length(candidate) between 3 and 40
    and candidate ~ '^[[:alnum:]][[:alnum:] ''-]*[[:alnum:]]$'
    and candidate !~ '[[:space:]]{2,}'
    and lower(candidate) not in ('admin', 'moderator', 'prototower', 'support', 'system')
$$;

create table public.account_profiles (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  pseudonym text not null,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_profiles_pseudonym_valid check (app_private.pseudonym_is_valid(pseudonym)),
  constraint account_profiles_revision_nonnegative check (revision >= 0)
);

comment on table public.account_profiles is
  'Private account presentation settings. Pseudonyms are not public handles or discovery identifiers.';
comment on column public.account_profiles.owner_id is
  'Supabase Auth owner derived by the mutation RPC; never accepted from a caller.';
comment on column public.account_profiles.pseudonym is
  'Private display name. It is intentionally non-unique and conveys no identity verification.';

alter table public.account_profiles enable row level security;
alter table public.account_profiles force row level security;

create policy account_profiles_read_own
on public.account_profiles
for select
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.account_profiles from public, anon, authenticated;
grant select on table public.account_profiles to authenticated;
grant select, insert, update, delete on table public.account_profiles to postgres, service_role;

create or replace function public.save_account_pseudonym(
  candidate_pseudonym text,
  expected_revision bigint default null
)
returns table (
  pseudonym text,
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
  current_profile public.account_profiles%rowtype;
  saved_profile public.account_profiles%rowtype;
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if not app_private.pseudonym_is_valid(candidate_pseudonym)
    or (expected_revision is not null and expected_revision < 0) then
    raise check_violation using message = 'Pseudonym input is invalid.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 1));

  select * into current_profile
  from public.account_profiles
  where owner_id = current_owner
  for update;

  if found then
    if expected_revision is null or current_profile.revision <> expected_revision then
      raise serialization_failure using message = 'Account profile revision is stale.';
    end if;

    update public.account_profiles as profile
    set pseudonym = candidate_pseudonym,
        revision = profile.revision + 1,
        updated_at = now()
    where profile.owner_id = current_owner
    returning * into saved_profile;
  else
    if expected_revision is not null then
      raise serialization_failure using message = 'Account profile revision is stale.';
    end if;

    insert into public.account_profiles (owner_id, pseudonym)
    values (current_owner, candidate_pseudonym)
    returning * into saved_profile;
  end if;

  return query select
    saved_profile.pseudonym,
    saved_profile.revision,
    saved_profile.created_at,
    saved_profile.updated_at;
end;
$$;

revoke all on function public.save_account_pseudonym(text, bigint) from public, anon;
grant execute on function public.save_account_pseudonym(text, bigint)
  to postgres, service_role, authenticated;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 6, "product_schema": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
