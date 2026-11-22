begin;

-- Initial setup now uses the same twenty-protocol cap as later edits.
-- Existing ownership checks, validation and grants remain unchanged.
create or replace function public.create_configured_personal_tower(
  candidate_title text,
  candidate_definition text,
  candidate_cadence text,
  candidate_custom_dates date[],
  candidate_audience text,
  candidate_identity text,
  candidate_protocols jsonb,
  candidate_metrics jsonb
)
returns table (
  id uuid,
  title text,
  definition text,
  cadence text,
  audience text,
  identity_mode text,
  custom_dates date[],
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
  stored_definition text;
  stored_identity text;
  stored_dates date[];
begin
  if current_owner is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;
  if not app_private.tower_title_is_valid(candidate_title) then
    raise check_violation using message = 'Tower title is invalid.';
  end if;

  stored_definition := app_private.validated_definition(candidate_definition);
  stored_identity := app_private.validated_identity(candidate_audience, candidate_identity);
  stored_dates := app_private.validated_dates(candidate_cadence, candidate_custom_dates);

  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 0));
  if (select count(*) from public.personal_towers where owner_id = current_owner) >= 12 then
    raise check_violation using message = 'Tower limit reached.';
  end if;

  insert into public.personal_towers (
    owner_id,
    title,
    definition,
    cadence,
    audience,
    identity_mode,
    custom_dates
  )
  values (
    current_owner,
    candidate_title,
    stored_definition,
    candidate_cadence,
    candidate_audience,
    stored_identity,
    stored_dates
  )
  returning * into created_tower;

  perform app_private.replace_tower_setup(
    created_tower.id,
    candidate_protocols,
    candidate_metrics,
    20
  );

  return query
  select
    created_tower.id,
    created_tower.title,
    created_tower.definition,
    created_tower.cadence,
    created_tower.audience,
    created_tower.identity_mode,
    created_tower.custom_dates,
    created_tower.revision,
    created_tower.created_at,
    created_tower.updated_at;
end;
$$;

commit;
