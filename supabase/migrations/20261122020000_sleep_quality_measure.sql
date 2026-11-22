begin;

-- Quality ratings and sleep duration keep distinct, stable preset identities.
create or replace function app_private.metric_preset_matches(
  candidate_preset text,
  candidate_kind text,
  candidate_shape text
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case candidate_preset
    when 'weight' then candidate_kind = 'ongoing' and candidate_shape = 'weight'
    when 'feeling' then candidate_kind = 'ongoing' and candidate_shape = 'rating'
    when 'blood-pressure' then candidate_kind = 'ongoing' and candidate_shape = 'blood_pressure'
    when 'note' then candidate_kind = 'ongoing' and candidate_shape = 'qualitative'
    when 'workouts' then candidate_kind = 'proxy' and candidate_shape = 'count'
    when 'sleep-quality' then candidate_kind = 'ongoing' and candidate_shape = 'rating'
    when 'sleep-hours' then candidate_kind = 'proxy' and candidate_shape = 'hours'
    when 'outreach' then candidate_kind = 'proxy' and candidate_shape = 'count'
    when 'goal-complete' then candidate_kind = 'final' and candidate_shape = 'complete_incomplete'
    when 'success-rating' then candidate_kind = 'final' and candidate_shape = 'scale_1_5'
    when 'percent-successful' then candidate_kind = 'final' and candidate_shape = 'percent'
    else false
  end
$$;

commit;
