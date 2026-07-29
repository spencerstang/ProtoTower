begin;

create schema if not exists app_private;
comment on schema app_private is 'Internal ProtoStack infrastructure objects not exposed through the public API.';

revoke all on schema app_private from public, anon, authenticated;

grant usage on schema app_private to postgres, service_role;

create table if not exists app_private.platform_metadata (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint platform_metadata_key_not_blank check (length(trim(key)) > 0)
);

comment on table app_private.platform_metadata is 'Non-user operational metadata for repository and migration verification.';

revoke all on table app_private.platform_metadata from public, anon, authenticated;
grant select, insert, update, delete on table app_private.platform_metadata to postgres, service_role;

insert into app_private.platform_metadata (key, value)
values ('schema_stage', '{"milestone": 1, "product_schema": false}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
