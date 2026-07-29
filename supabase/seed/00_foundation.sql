-- Synthetic development metadata only. No user, medical, contact, or production data is permitted here.
insert into app_private.platform_metadata (key, value)
values ('synthetic_seed', '{"dataset": "milestone-1", "synthetic": true}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
