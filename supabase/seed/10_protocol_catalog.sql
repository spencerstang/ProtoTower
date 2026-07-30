-- Deterministic synthetic educational catalog data only. No personal or production data.
insert into public.protocols (id, slug, status, created_at)
values
  ('10000000-0000-4000-8000-000000000001', 'morning-light-routine', 'active', '2026-07-29T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'desk-movement-breaks', 'active', '2026-07-29T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000003', 'evening-wind-down', 'active', '2026-07-29T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000004', 'retired-synthetic-routine', 'retired', '2026-07-29T12:00:00Z')
on conflict (id) do update
set slug = excluded.slug,
    status = excluded.status;

insert into public.protocol_versions (
  protocol_id,
  version,
  title,
  summary,
  overview,
  steps,
  cautions,
  reference_links,
  published_at,
  created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    1,
    'Morning light routine',
    'A synthetic educational routine for beginning the day outdoors.',
    'Use a short, comfortable outdoor period as a consistent start-of-day cue.',
    '[
      {"position": 1, "title": "Choose a safe location", "description": "Select an accessible outdoor area away from traffic."},
      {"position": 2, "title": "Spend a short period outside", "description": "Remain comfortable and avoid looking directly at the sun."}
    ]'::jsonb,
    '["Avoid looking directly at the sun."]'::jsonb,
    '[{"label": "Synthetic educational reference", "url": "https://example.com/morning-light"}]'::jsonb,
    '2026-07-29T12:00:00Z',
    '2026-07-29T11:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    2,
    'Morning outdoor cue',
    'A revised synthetic routine for pairing a safe outdoor pause with the start of the day.',
    'Build the first level of a habit tower with a brief, repeatable outdoor cue that stays comfortable.',
    '[
      {"position": 1, "title": "Pick a repeatable cue", "description": "Choose a normal morning action that can remind you to step outside."},
      {"position": 2, "title": "Use a comfortable outdoor space", "description": "Spend a brief period in a safe location without looking directly at the sun."},
      {"position": 3, "title": "Return to the day", "description": "End the pause whenever conditions feel uncomfortable."}
    ]'::jsonb,
    '["Never look directly at the sun.", "Use an accessible location and stop if conditions are uncomfortable."]'::jsonb,
    '[{"label": "Synthetic educational reference", "url": "https://example.com/morning-outdoor-cue"}]'::jsonb,
    '2026-07-29T13:00:00Z',
    '2026-07-29T12:30:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    1,
    'Desk movement breaks',
    'A synthetic routine for adding gentle movement pauses to desk time.',
    'Use ordinary transitions as reminders to stand, change position, or take a short comfortable walk.',
    '[
      {"position": 1, "title": "Choose a transition", "description": "Use a routine transition, such as finishing a task, as a movement cue."},
      {"position": 2, "title": "Move comfortably", "description": "Stand, change position, or walk briefly within your normal ability."},
      {"position": 3, "title": "Resume without pressure", "description": "Return to the next task without treating a missed break as failure."}
    ]'::jsonb,
    '["Stay within your normal range of comfortable movement.", "Stop if movement causes pain or dizziness."]'::jsonb,
    '[]'::jsonb,
    '2026-07-29T12:00:00Z',
    '2026-07-29T11:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    1,
    'Evening wind-down',
    'A synthetic routine for creating a calm transition into the evening.',
    'Pair a small environmental change with a short planning step to make the end of the day feel deliberate.',
    '[
      {"position": 1, "title": "Mark the transition", "description": "Choose a consistent evening cue, such as dimming a lamp."},
      {"position": 2, "title": "Prepare one thing", "description": "Set out one ordinary item that will make tomorrow easier."},
      {"position": 3, "title": "Choose a quiet activity", "description": "Spend a few comfortable minutes on a low-pressure activity."}
    ]'::jsonb,
    '["Keep pathways and rooms safely lit.", "Choose an activity that fits your needs and environment."]'::jsonb,
    '[{"label": "Synthetic educational reference", "url": "https://example.com/evening-transition"}]'::jsonb,
    '2026-07-29T12:00:00Z',
    '2026-07-29T11:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    2,
    'Unpublished evening revision',
    'A synthetic draft that anonymous visitors must never receive.',
    'This draft exists only to prove the publication boundary.',
    '[{"position": 1, "title": "Draft step", "description": "This synthetic draft remains private."}]'::jsonb,
    '["Do not expose unpublished synthetic content."]'::jsonb,
    '[]'::jsonb,
    null,
    '2026-07-29T13:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    1,
    'Retired synthetic routine',
    'Synthetic content that anonymous visitors must never receive.',
    'This record exists only to prove that retired protocols remain hidden.',
    '[{"position": 1, "title": "Hidden step", "description": "This synthetic retired content remains hidden."}]'::jsonb,
    '["Do not expose retired synthetic content."]'::jsonb,
    '[]'::jsonb,
    '2026-07-29T12:00:00Z',
    '2026-07-29T11:00:00Z'
  )
on conflict (protocol_id, version) do nothing;

insert into app_private.platform_metadata (key, value)
values ('synthetic_seed', '{"dataset": "milestone-2-protocol-catalog", "synthetic": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
