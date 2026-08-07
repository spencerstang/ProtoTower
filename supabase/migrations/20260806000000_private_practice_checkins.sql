begin;

alter table public.personal_towers
  add constraint personal_towers_id_owner_unique unique (id, owner_id);

create table public.protocol_practice_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  tower_id uuid not null,
  protocol_id uuid not null,
  protocol_version integer not null,
  practice_date date not null,
  created_at timestamptz not null default now(),
  constraint protocol_practice_checkins_version_positive
    check (protocol_version > 0),
  constraint protocol_practice_checkins_tower_owner_fkey
    foreign key (tower_id, owner_id)
    references public.personal_towers (id, owner_id)
    on delete cascade,
  constraint protocol_practice_checkins_protocol_version_fkey
    foreign key (protocol_id, protocol_version)
    references public.protocol_versions (protocol_id, version),
  constraint protocol_practice_checkins_daily_unique
    unique (owner_id, tower_id, protocol_id, protocol_version, practice_date)
);

comment on table public.protocol_practice_checkins is
  'Private user-entered practice check-ins. A row is not evidence of adherence, efficacy, or a health outcome.';
comment on column public.protocol_practice_checkins.owner_id is
  'Supabase Auth owner derived by the mutation RPC; never accepted from a caller.';
comment on column public.protocol_practice_checkins.practice_date is
  'Private calendar date selected by the owner within the bounded correction window.';
comment on column public.protocol_practice_checkins.created_at is
  'Operational creation timestamp; not a duration or outcome measurement.';

create index protocol_practice_checkins_owner_tower_date_idx
  on public.protocol_practice_checkins (
    owner_id,
    tower_id,
    practice_date desc,
    protocol_id,
    protocol_version
  );

create index protocol_practice_checkins_owner_date_idx
  on public.protocol_practice_checkins (owner_id, practice_date desc, id);

alter table public.protocol_practice_checkins enable row level security;
alter table public.protocol_practice_checkins force row level security;

create policy protocol_practice_checkins_read_own
on public.protocol_practice_checkins
for select
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.protocol_practice_checkins from public, anon, authenticated;
grant select on table public.protocol_practice_checkins to authenticated;
grant select, insert, update, delete on table public.protocol_practice_checkins
  to postgres, service_role;

create or replace function public.set_protocol_practice_checkin(
  candidate_tower_id uuid,
  candidate_protocol_id uuid,
  candidate_protocol_version integer,
  candidate_practice_date date,
  candidate_recorded boolean
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  current_owner uuid := (select auth.uid());
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if candidate_tower_id is null
    or candidate_protocol_id is null
    or candidate_protocol_version is null
    or candidate_protocol_version <= 0
    or candidate_practice_date is null
    or candidate_recorded is null
    or candidate_practice_date < current_date - 29
    or candidate_practice_date > current_date + 1 then
    raise check_violation using message = 'Practice input is invalid.';
  end if;

  perform 1
  from public.personal_towers
  where id = candidate_tower_id
    and owner_id = current_owner
  for update;

  if not found then
    raise no_data_found using message = 'Practice target was not found.';
  end if;

  if candidate_recorded then
    if not exists (
      select 1
      from public.personal_tower_items
      where tower_id = candidate_tower_id
        and protocol_id = candidate_protocol_id
        and protocol_version = candidate_protocol_version
    ) then
      raise no_data_found using message = 'Practice target was not found.';
    end if;

    insert into public.protocol_practice_checkins (
      owner_id,
      tower_id,
      protocol_id,
      protocol_version,
      practice_date
    )
    values (
      current_owner,
      candidate_tower_id,
      candidate_protocol_id,
      candidate_protocol_version,
      candidate_practice_date
    )
    on conflict (owner_id, tower_id, protocol_id, protocol_version, practice_date)
    do nothing;

    return true;
  end if;

  delete from public.protocol_practice_checkins
  where owner_id = current_owner
    and tower_id = candidate_tower_id
    and protocol_id = candidate_protocol_id
    and protocol_version = candidate_protocol_version
    and practice_date = candidate_practice_date;

  return false;
end;
$$;

revoke all on function public.set_protocol_practice_checkin(uuid, uuid, integer, date, boolean)
  from public, anon;
grant execute on function public.set_protocol_practice_checkin(uuid, uuid, integer, date, boolean)
  to postgres, service_role, authenticated;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 4, "product_schema": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
