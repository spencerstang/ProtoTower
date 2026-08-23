begin;

-- Public, reviewed educational catalog content. These rows contain no user data and
-- deliberately live in a forward-only migration so production receives the same
-- immutable versions without loading development seeds.
insert into public.protocols (id, slug, status, created_at)
values
  ('20000000-0000-4000-8000-000000000001', 'huberman-daily-sleep-wake-blueprint', 'active', '2026-08-23T12:00:00Z'),
  ('20000000-0000-4000-8000-000000000002', 'attia-centenarian-decathlon', 'active', '2026-08-23T12:00:00Z'),
  ('20000000-0000-4000-8000-000000000003', 'patrick-sauna-heat-exposure', 'active', '2026-08-23T12:00:00Z'),
  ('20000000-0000-4000-8000-000000000004', 'johnson-pre-sleep-rhr-routine', 'active', '2026-08-23T12:00:00Z')
on conflict (id) do nothing;

insert into public.protocol_versions (
  protocol_id, version, title, summary, overview, steps, cautions,
  reference_links, published_at, created_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    1,
    'Andrew Huberman: Daily sleep-wake blueprint',
    'An attributed daily routine for circadian alignment, daytime alertness, and sleep preparation.',
    'Expert recommendation and evidence strength are separate. Huberman recommends early outdoor light, a consistent wake time, delayed caffeine, daytime activity, and a dim, cool, dark sleep environment. Independent evidence tier: Mixed. Daytime light and avoiding late caffeine or prolonged bright evening screens have human evidence, but the exact 90–120 minute caffeine delay and the complete bundle have not been validated as one protocol. Track wake-time variance, light exposure, caffeine timing, sleep onset, awakenings, and subjective alertness. Verified 2026-08-23.',
    '[
      {"position":1,"title":"Get outdoor morning light","description":"Within 30–60 minutes of waking, go outdoors for 5–10 minutes on a sunny day, 10–15 minutes when cloudy, or up to 30 minutes when overcast. These weather-based durations are Huberman recommendations, not independently validated thresholds. Never stare directly at the sun."},
      {"position":2,"title":"Keep wake time consistent","description":"Wake at the usual time each day. After short-term sleep loss, Huberman advises not sleeping more than one hour past the normal wake time. Individualize for shift work, illness, or clinician-directed recovery."},
      {"position":3,"title":"Delay the first caffeine","description":"On caffeine-use days, Huberman recommends waiting 90–120 minutes after waking. The source gives no universal dose and notes an exception for very early intense exercise. Caffeine-sensitive people may need less or none."},
      {"position":4,"title":"Dim evening light and screens","description":"After sunset, reduce bright overhead light and screen brightness; use a red-hued filter if needed. Keep pathways safely lit. Effects depend on brightness, duration, and daytime light exposure."},
      {"position":5,"title":"Prepare the sleep environment","description":"At bedtime, make the room as dark as practical and roughly 1–3 degrees Fahrenheit cooler than usual. This is a relative recommendation, not a universal absolute temperature."},
      {"position":6,"title":"Use NSDR as an optional recovery tool","description":"Huberman suggests 10–30 minutes of NSDR for afternoon fatigue, or NSDR after a nighttime awakening. Do not use it when alertness is required, such as while driving."}
    ]'::jsonb,
    '[
      "This is general educational information, not diagnosis or treatment.",
      "Never look directly at the sun; adapt light exposure for ocular or light-sensitive conditions with qualified guidance.",
      "Caffeine can worsen anxiety, palpitations, blood pressure, pregnancy-related exposure concerns, and sleep; individualize or omit it."
    ]'::jsonb,
    '[
      {"label":"Huberman Lab — The Daily Blueprint","url":"https://www.hubermanlab.com/daily-blueprint"},
      {"label":"Daylight crossover study (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/34639284/"},
      {"label":"Caffeine timing and sleep trial (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/24235903/"},
      {"label":"Evening e-reader randomized study (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/25535358/"}
    ]'::jsonb,
    '2026-08-23T12:00:00Z',
    '2026-08-23T12:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    1,
    'Peter Attia: Centenarian Decathlon framework',
    'A goal-led exercise framework spanning stability, strength, zone 2, and high-intensity aerobic work.',
    'Expert recommendation and evidence strength are separate. Attia organizes training around late-life functional goals and four pillars: stability, strength, low-intensity aerobic efficiency, and high-intensity VO2-max work. Independent evidence tier: Moderate. Aerobic and muscle-strengthening exercise have strong guideline support, while Attia’s exact zone split, lactate target, and personal weekly volume are expert-derived. Track functional tasks, balance, strength, weekly aerobic minutes, pace or power at matched effort, and VO2 max. Verified 2026-08-23.',
    '[
      {"position":1,"title":"Define late-life functional goals","description":"List concrete physical tasks you want to retain late in life and use them to shape training. Review the list when health or priorities change; there is no fixed number of tasks."},
      {"position":2,"title":"Practice stability and balance","description":"Integrate brief stability or balance work through the week. Attia treats it as a foundational pillar, but the cited source does not establish one universal duration."},
      {"position":3,"title":"Train strength progressively","description":"Attia reports 3–5 strength bouts per week in his typical routine. The WHO evidence floor is muscle-strengthening work for major muscle groups on at least two days per week. Load, sets, and movement selection require individualization."},
      {"position":4,"title":"Accumulate zone 2 work","description":"Attia suggests about two hours per week for a beginner and three to four hours per week as an ideal or personal target, spread across the week. Heart rate alone may not precisely define zone 2, and lactate testing is optional."},
      {"position":5,"title":"Add VO2-max intervals","description":"After warming up, perform four minutes at the highest sustainable intensity followed by four minutes of recovery; repeat four to six times, then cool down. The cited prescription is commonly used once weekly and is not a beginner starting point."},
      {"position":6,"title":"Reassess progress","description":"Track VO2 max when accuracy matters with a lab or appropriate field test, plus submaximal pace or power and weekly adherence. Wearable estimates have limits and short-term changes should not be overinterpreted."}
    ]'::jsonb,
    '[
      "This is general educational information and does not replace individualized exercise or medical guidance.",
      "Start below the listed personal or ideal volumes when untrained and progress gradually.",
      "Older, deconditioned, pregnant, injured, or cardiometabolic patients may require individualized assessment; stop for chest pain, fainting, or unusual severe symptoms."
    ]'::jsonb,
    '[
      {"label":"Peter Attia — Training for the Centenarian Decathlon","url":"https://peterattiamd.com/training-for-the-centenarian-decathlon/"},
      {"label":"Peter Attia — Zone 2 and Zone 5 training","url":"https://peterattiamd.com/exercising-for-longevity-peter-on-zone-2-and-zone-5-training/"},
      {"label":"Peter Attia — High-intensity 4x4 protocol","url":"https://peterattiamd.com/high-intensity-training-zone-5-to-increase-vo2-max/"},
      {"label":"WHO physical activity guidelines","url":"https://www.who.int/publications/i/item/9789240015128"}
    ]'::jsonb,
    '2026-08-23T12:00:00Z',
    '2026-08-23T12:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    1,
    'Rhonda Patrick: Sauna and heat exposure',
    'Patrick’s heat-adapted personal sauna routine presented separately from the observational evidence anchor she discusses.',
    'Expert recommendation and evidence strength are separate. Patrick discusses a Finnish-sauna research exposure around 174°F for 20 minutes and describes her hotter personal routine only for heat-adapted use. Independent evidence tier: Limited. Prospective cohorts associate more frequent and longer sauna use with lower cardiovascular and all-cause mortality, but causality, broad generalizability, and the exact protocol remain uncertain. Track temperature, duration, weekly frequency, symptoms, heart rate, and pre/post body mass. Verified 2026-08-23.',
    '[
      {"position":1,"title":"Use the research exposure as an evidence anchor","description":"Patrick discusses roughly 174°F (79°C), 10–20% humidity, and about 20 minutes. Two sessions per week showed a minimum observational signal, while four to seven showed the strongest association. This is not a proven causal dose."},
      {"position":2,"title":"Separate Patrick’s personal routine","description":"When already heat-adapted, Patrick reports roughly 186°F (86°C) for 20–30 minutes, usually about four times per week but varying from two to five. This is her personal routine and not a starting dose."},
      {"position":3,"title":"Optionally pair heat with exercise","description":"Patrick sometimes enters the sauna immediately after selected cycling or interval sessions. Exercise already raises core temperature, so the combined heat load may require a shorter exposure."},
      {"position":4,"title":"Replace fluid losses","description":"Rehydrate after each session as needed. Patrick discusses fluids and electrolytes but gives no quantified universal dose; avoid indiscriminate electrolyte loading when kidney, heart, or medication considerations apply."},
      {"position":5,"title":"Pause before optional cold exposure","description":"If choosing hot-to-cold contrast, Patrick reports resting about two to five minutes first because immediate transitions caused dizziness and apparent blood-pressure changes. Skip the cold exposure when symptomatic."}
    ]'::jsonb,
    '[
      "This is general educational information, not a proven treatment or individualized heat prescription.",
      "Heat illness, dehydration, dizziness, and blood-pressure changes are possible; exit for confusion, weakness, severe discomfort, or concerning rapid heart rate.",
      "Seek qualified guidance for relevant cardiovascular disease, pregnancy, heat-sensitive medications or conditions, or prior heat intolerance."
    ]'::jsonb,
    '[
      {"label":"FoundMyFitness — Rhonda Patrick’s sauna routine","url":"https://www.foundmyfitness.com/episodes/sauna-routine-rhonda-medcram"},
      {"label":"Sauna bathing and mortality cohort (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/25705824/"}
    ]'::jsonb,
    '2026-08-23T12:00:00Z',
    '2026-08-23T12:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    1,
    'Bryan Johnson: Pre-sleep resting-heart-rate routine',
    'An attributed evening routine aimed at lowering pre-sleep arousal and supporting sleep.',
    'Expert recommendation and evidence strength are separate. Johnson recommends separating food, caffeine, and screens from bedtime while using calming activities and dimmer light. Independent evidence tier: Mixed. Trials support avoiding substantial late caffeine and show that prolonged bright evening screen exposure can delay circadian timing. Evidence for a universal four-hour meal cutoff or pre-sleep resting heart rate as the single best health target is limited. Track meal-to-bed and caffeine intervals, screen-off time, pre-sleep RHR, overnight RHR or HRV, sleep duration, efficiency, and subjective restoration. Verified 2026-08-23.',
    '[
      {"position":1,"title":"Finish food before bedtime","description":"Johnson recommends finishing the final meal or snack four hours before intended bedtime. The exact cutoff is not strongly validated and should be individualized; his personal noon cutoff is not generalized here."},
      {"position":2,"title":"Turn screens off","description":"Use a 60-minute screen-free period before bed. If a device is necessary, reduce brightness and blue-enriched light. The exact 60-minute cutoff is expert advice, and effects depend on exposure conditions."},
      {"position":3,"title":"Use a calming wind-down","description":"Read a book for about 10 minutes during the final pre-sleep hour. Johnson also lists walking, journaling, meditation, breathwork, a quiet hobby, or calling a friend; these alternatives are not equivalent evidence-tested doses."},
      {"position":4,"title":"Avoid late caffeine","description":"Johnson notes an approximately six-hour caffeine half-life. A human trial found 400 mg even six hours before bed reduced sleep, but that dose does not establish an identical effect for every person or amount."},
      {"position":5,"title":"Use dim red or amber evening light","description":"Use red or amber, dimmer light in the evening without compromising safe navigation or fall prevention. No universal illuminance or duration is specified."},
      {"position":6,"title":"Track trends, not diagnoses","description":"Review pre-sleep and overnight resting heart rate, HRV, and sleep response as trends. Johnson’s personal target near 39 bpm is not a general recommendation, and wearable measurements are not diagnostic."}
    ]'::jsonb,
    '[
      "This is general educational information and does not replace evaluation for insomnia, sleep apnea, or heart-rate symptoms.",
      "Do not impose an early eating cutoff if it causes inadequate intake, hypoglycemia, disordered-eating risk, or conflicts with diabetes or medication needs.",
      "Very low or high heart rate with symptoms requires qualified medical evaluation; wearable RHR and HRV are trend measures, not diagnoses."
    ]'::jsonb,
    '[
      {"label":"Blueprint — Bryan Johnson’s protocol","url":"https://blueprint.bryanjohnson.com/blogs/news/bryan-johnsons-protocol"},
      {"label":"Caffeine timing and sleep trial (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/24235903/"},
      {"label":"Evening e-reader randomized study (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/25535358/"},
      {"label":"Late-night meal crossover study (PubMed)","url":"https://pubmed.ncbi.nlm.nih.gov/33426778/"}
    ]'::jsonb,
    '2026-08-23T12:00:00Z',
    '2026-08-23T12:00:00Z'
  )
on conflict (protocol_id, version) do nothing;

comment on table public.protocol_versions is
  'Versioned educational protocol content. Published rows are immutable; development seeds remain synthetic.';

insert into app_private.platform_metadata (key, value)
values (
  'curated_protocol_library',
  '{"dataset":"initial-expert-library","protocol_count":4,"verified_on":"2026-08-23","contains_user_data":false}'::jsonb
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

commit;
