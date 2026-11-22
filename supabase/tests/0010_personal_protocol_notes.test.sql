begin;
select plan(9);

create temporary table note_towers (kind text primary key, id uuid);
grant select, insert on note_towers to authenticated;

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('33000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'note-owner@example.test', '{}', '{}'),
  ('33000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'note-other@example.test', '{}', '{}');

create function pg_temp.published_protocol()
returns table (id uuid, version integer)
language sql
as $$
  select p.id, v.version
  from public.protocols p
  join public.protocol_versions v on v.protocol_id = p.id
  where p.status = 'active' and v.published_at is not null
  order by p.id, v.version desc
  limit 1
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000001', true);

select lives_ok($test$
  insert into note_towers
  select 'configured', result.id
  from pg_temp.published_protocol() p
  cross join lateral public.create_configured_personal_tower(
    'Synthetic configured tower', null, 'weekly', '{}', 'private', 'named',
    jsonb_build_array(jsonb_build_object(
      'title', 'Synthetic protocol', 'how_to', 'Use the published plan.',
      'source_protocol_id', p.id, 'source_protocol_version', p.version,
      'personal_note', 'Personal adaptation.'
    )),
    '[{"kind":"final","shape":"percent","label":"Sessions done","preset_key":"percent-successful"}]'
  ) result;
$test$, 'a configured library protocol can store a private adaptation');

select results_eq(
  $$ select personal_note from public.tower_protocols where tower_id = (select id from note_towers where kind = 'configured') $$,
  array['Personal adaptation.'::text],
  'the configured note is stored separately'
);

select lives_ok($test$
  select public.save_tower_setup(
    p.tower_id, t.revision, 'Synthetic configured tower', null, 'weekly', '{}', 'private', 'named',
    jsonb_build_array(jsonb_build_object(
      'id', p.id, 'title', p.title, 'how_to', p.how_to,
      'source_protocol_id', p.source_protocol_id, 'source_protocol_version', p.source_protocol_version
    )),
    jsonb_build_array(jsonb_build_object(
      'id', m.id, 'kind', m.kind, 'shape', m.shape, 'label', 'Planned sessions done', 'preset_key', m.preset_key
    ))
  ) from public.tower_protocols p
  join public.personal_towers t on t.id = p.tower_id
  join public.tower_metrics m on m.tower_id = p.tower_id
  where p.tower_id = (select id from note_towers where kind = 'configured');
$test$, 'a legacy payload can rename a preset while retaining its id and key');

select results_eq(
  $$ select p.personal_note, m.label, m.preset_key from public.tower_protocols p
     join public.tower_metrics m on p.tower_id = m.tower_id
     where p.tower_id = (select id from note_towers where kind = 'configured') $$,
  $$ values ('Personal adaptation.'::text, 'Planned sessions done'::text, 'percent-successful'::text) $$,
  'the personal note and the preset identity survive setup replacement'
);

insert into note_towers select 'blocks', id from public.create_personal_tower('Synthetic block tower');
select public.save_personal_tower(t.id, t.title,
  jsonb_build_array(jsonb_build_object('protocol_id', p.id, 'protocol_version', p.version, 'position', 1)),
  t.revision
)
from public.personal_towers t cross join pg_temp.published_protocol() p
where t.id = (select id from note_towers where kind = 'blocks');

select lives_ok($test$
  select public.save_tower_item_note(t.id, p.protocol_id, p.protocol_version, 'Private block note.', t.revision)
  from public.personal_towers t
  join public.personal_tower_items p on p.tower_id = t.id
  where t.id = (select id from note_towers where kind = 'blocks');
$test$, 'the owner can personalize a saved library block');

select public.save_personal_tower(t.id, 'Renamed block tower',
  jsonb_build_array(jsonb_build_object('protocol_id', p.protocol_id, 'protocol_version', p.protocol_version, 'position', p.position)),
  t.revision
)
from public.personal_towers t join public.personal_tower_items p on p.tower_id = t.id
where t.id = (select id from note_towers where kind = 'blocks');

select results_eq(
  $$ select personal_note from public.personal_tower_items where tower_id = (select id from note_towers where kind = 'blocks') $$,
  array['Private block note.'::text],
  'the block note survives a tower rename'
);

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.tower_protocols where personal_note is not null), 0::bigint, 'other owners cannot read configured notes');
select is((select count(*) from public.personal_tower_items where personal_note is not null), 0::bigint, 'other owners cannot read block notes');

select throws_ok($test$
  select public.save_tower_item_note(t.id, p.id, p.version, 'Attempted edit.', 2)
  from note_towers t cross join pg_temp.published_protocol() p
  where t.kind = 'blocks';
$test$, 'P0002', 'Tower was not found.', 'other owners cannot edit block notes');

select * from finish();
rollback;
