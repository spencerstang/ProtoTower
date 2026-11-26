begin;

-- One credential per account. Private tables have no API role grants.
create table app_private.tower_assistants (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  fingerprint bytea unique not null,
  expires_at timestamptz not null,
  last_used_at timestamptz
);
create table app_private.measurement_proposals (
  tower_id uuid not null references public.personal_towers(id) on delete cascade,
  owner_id uuid not null references app_private.tower_assistants(owner_id) on delete cascade,
  direct boolean not null,
  request_id uuid not null,
  revision bigint not null,
  label text not null check (app_private.plain_text_is_valid(label,1,80)),
  shape text not null check (shape in ('rating','number','hours')),
  unit text check (shape='number' and app_private.plain_text_is_valid(unit,1,24)),
  state text not null default 'pending' check (state in ('pending','approved','declined')),
  metric_id uuid,
  primary key(tower_id, request_id)
);
revoke all on app_private.tower_assistants, app_private.measurement_proposals from public, anon, authenticated;
alter table app_private.tower_assistants enable row level security;
alter table app_private.measurement_proposals enable row level security;

create function app_private.apply_assistant_measurement(tid uuid,current_rev bigint,p app_private.measurement_proposals)
returns uuid language plpgsql set search_path = '' as $$
declare pos integer; metric uuid;
begin
      if p.revision<>current_rev then raise serialization_failure using message='Tower changed'; end if;
      select coalesce(max(position),0)+1 into pos from public.tower_metrics where tower_id=tid;
      if pos>12 or exists(select 1 from public.tower_metrics where tower_id=tid and lower(label)=lower(p.label))
        or not exists(select 1 from public.tower_metrics where tower_id=tid and kind='final') then raise check_violation; end if;
      insert into public.tower_metrics(tower_id,position,kind,shape,label,unit)
        values(tid,pos,case when p.shape='hours' then 'proxy' else 'ongoing' end,p.shape,p.label,p.unit)
        returning id into metric;
      update public.personal_towers set revision=revision+1,updated_at=clock_timestamp() where id=tid;
  return metric;
end $$;
revoke all on function app_private.apply_assistant_measurement(uuid,bigint,app_private.measurement_proposals) from public,anon,authenticated;

create function public.manage_tower_assistant(operation text, tid uuid default null, proposal uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.personal_towers;
  g app_private.tower_assistants;
  p app_private.measurement_proposals;
  secret text;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into g from app_private.tower_assistants where owner_id=auth.uid() for update;
  if operation='connect' then
    if g.expires_at > now() then raise check_violation using message='Revoke the active connection first.'; end if;
    delete from app_private.tower_assistants where owner_id=auth.uid();
    secret := 'pta_' || replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
    insert into app_private.tower_assistants(owner_id,fingerprint,expires_at)
      values (auth.uid(),sha256(convert_to(secret,'UTF8')),now()+interval '30 days');
    return jsonb_build_object('token',secret);
  elsif operation='revoke' then
    delete from app_private.tower_assistants where owner_id=auth.uid();
    return '{"state":"revoked"}';
  elsif operation='list' then
    return jsonb_build_object('expires',g.expires_at,'lastUsed',g.last_used_at,'pending',
      coalesce((select jsonb_agg(jsonb_build_object('id',request_id,'towerId',m.tower_id,'goal',towers.title,'label',label,'shape',shape,'unit',unit,'stale',m.revision<>towers.revision) order by request_id)
      from app_private.measurement_proposals m join public.personal_towers towers on towers.id=m.tower_id where m.owner_id=auth.uid() and towers.owner_id=auth.uid() and m.state='pending'),'[]'::jsonb));
  end if;
  if g.expires_at is null or g.expires_at<=now() then raise insufficient_privilege; end if;
  select * into strict t from public.personal_towers where id=tid and owner_id=auth.uid() for update;
  select * into strict p from app_private.measurement_proposals where tower_id=tid and request_id=proposal for update;
  if operation not in ('approve','decline') or operation is null then raise check_violation; end if;
  if p.state='pending' then
    if operation='approve' then
      p.metric_id := app_private.apply_assistant_measurement(tid,t.revision,p);
    end if;
    p.state := case when operation='approve' then 'approved' else 'declined' end;
    update app_private.measurement_proposals set state=p.state,metric_id=p.metric_id where tower_id=tid and request_id=proposal;
  end if;
  return jsonb_build_object('state',p.state,'metricId',p.metric_id);
end $$;

-- Resolve the account from the credential, then enforce ownership on the requested Tower.
create function public.use_tower_assistant(credential text, tid uuid default null, payload jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  grant_owner uuid;
  t public.personal_towers;
  p app_private.measurement_proposals;
  rid uuid;
  rev bigint;
begin
  if credential is null or credential !~ '^pta_[0-9a-f]{64}$' then raise insufficient_privilege; end if;
  update app_private.tower_assistants set last_used_at=clock_timestamp()
    where fingerprint=sha256(convert_to(credential,'UTF8')) and expires_at>clock_timestamp() returning owner_id into grant_owner;
  if grant_owner is null then raise insufficient_privilege; end if;
  if tid is null and payload is null then
    return jsonb_build_object('towers',coalesce((select jsonb_agg(jsonb_build_object('towerId',id,'goal',title,'revision',revision) order by id) from public.personal_towers where owner_id=grant_owner),'[]'::jsonb));
  end if;
  select * into t from public.personal_towers where id=tid and owner_id=grant_owner for update;
  if not found then raise no_data_found; end if;
  if payload is null then
    return jsonb_build_object('towerId',tid,'goal',t.title,'definition',t.definition,'revision',t.revision,
      'protocols',coalesce((select jsonb_agg(jsonb_build_object('title',title,'instructions',how_to,'myVersion',personal_note,'sourceId',source_protocol_id,'version',source_protocol_version) order by position) from public.tower_protocols where tower_id=tid),'[]'::jsonb),
      'measurements',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'shape',shape,'unit',unit,'required',kind='final') order by position) from public.tower_metrics where tower_id=tid),'[]'::jsonb));
  end if;
  if jsonb_typeof(payload)<>'object' or not (payload ?& array['requestId','revision','label','shape','mode'])
    or (payload-array['requestId','revision','label','shape','unit','mode']) <> '{}'::jsonb
    or jsonb_typeof(payload->'label')<>'string' or jsonb_typeof(payload->'requestId')<>'string'
    or jsonb_typeof(payload->'mode')<>'string' or payload->>'mode' not in ('save','propose')
    or jsonb_typeof(payload->'revision')<>'number' or jsonb_typeof(payload->'shape')<>'string'
    or (payload ? 'unit' and jsonb_typeof(payload->'unit') not in ('string','null')) then raise check_violation; end if;
  rid := (payload->>'requestId')::uuid;
  rev := (payload->>'revision')::bigint;
  select * into p from app_private.measurement_proposals where tower_id=tid and request_id=rid;
  if found then
    if (p.revision,p.label,p.shape,p.unit,p.direct) is distinct from (rev,payload->>'label',payload->>'shape',payload->>'unit',(payload->>'mode'='save')) then raise serialization_failure; end if;
  else
    if rev<>t.revision then raise serialization_failure; end if;
    if (select count(*) from app_private.measurement_proposals where tower_id=tid and state='pending')>=100 and payload->>'mode'='propose' then raise program_limit_exceeded; end if;
    insert into app_private.measurement_proposals(owner_id,tower_id,request_id,revision,label,shape,unit,direct)
      values(grant_owner,tid,rid,rev,payload->>'label',payload->>'shape',payload->>'unit',payload->>'mode'='save') returning * into p;
    if p.direct then
      p.metric_id := app_private.apply_assistant_measurement(tid,t.revision,p);
      p.state := 'approved';
      update app_private.measurement_proposals set state=p.state,metric_id=p.metric_id where tower_id=tid and request_id=rid;
    end if;
  end if;
  return jsonb_build_object('requestId',rid,'state',p.state,'metricId',p.metric_id,'towerId',tid);
end $$;
revoke all on function public.manage_tower_assistant(text,uuid,uuid), public.use_tower_assistant(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.manage_tower_assistant(text,uuid,uuid) to authenticated;
grant execute on function public.use_tower_assistant(text,uuid,jsonb) to anon;
commit;
