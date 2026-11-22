# ProtoTower learning framework

Authoritative product direction from Spencer, recorded November 22, 2026. Preserve this framework in future product, data-model, analytics, and agent work. It describes the objective; it does not claim that group analytics or rankings are currently implemented.

## Core pattern: goal → protocol → outcome

A key goal of ProtoTower is to identify a repeatable pattern consisting of a goal, a protocol used to pursue that goal, and an observed outcome. Track the pattern across people and over time, looking for key indications of success and failure. Goals may describe a discrete result or an ongoing desired state supported by a system.

The most important indications to investigate are patterns with 100% observed success or 100% observed failure. These will be rare. Preserve and prioritize both extremes, including strong failure signals, rather than focusing only on average improvement or positive results.

## Learning sequence

1. Establish and track individual goal–protocol–outcome patterns.
2. Measure each protocol's absolute success and failure for a defined goal and outcome.
3. Once a pattern is established, compare it with other protocols attempting the same goal, using comparable outcomes.
4. Rank protocols from best to worst relative to the alternatives, while also displaying absolute success. A best-ranked protocol may still have a low absolute success rate; these are separate findings.
5. Establish evidence for protocols in isolation before moving to comparisons of towers/stacks.
6. Compare towers with individual protocols and other stacks to determine whether stacking increases efficacy or goal achievement. Look for incremental benefit, interactions, redundancy, and combinations that underperform their components.

This is an evolving framework. Future refinements should extend this sequence rather than losing the goal–protocol–outcome relationship or jumping directly to opaque tower scores.

## Interpretation and implementation implications

The following details support the user's direction; they are not substitutes for it:

- Keep stable goal, published protocol/version, and outcome definitions distinct from personal protocol adaptations and observations. Relationships are many-to-many; overlapping definitions create opportunities to learn.
- Define success/failure criteria, baseline, units, time window, exposure and adherence before labeling a pattern. Preserve continuous outcome values and changes as well as binary success/failure classifications. Missing, skipped, pending and indeterminate results are not automatic failures.
- Every displayed 100% rate must have its numerator, eligible denominator, distinct participant count, observation count and time window. A tiny sample with a perfect observed rate is a signal to investigate, not proof of universal efficacy. Show uncertainty and data quality alongside the extreme rate rather than hiding either.
- Compare protocols against the same goal and sufficiently comparable outcomes, units, windows and participant context. Show limits when comparisons are not supportable. Do not pool incompatible custom measures or rank unrelated outcomes as though they were equivalent.
- Keep isolated protocol use distinct from concurrent stacks. A stack succeeding does not establish that every component works alone or that adding a component caused the benefit. Preserve stack membership, versions, timing, adherence and relevant context so incremental contributions can be studied.
- Distinguish observed associations from causal effects. Strong efficacy claims require evidence appropriate to those claims; potential confounding and selection effects remain visible.
- Shared learning uses explicitly opted-in contributions, owner isolation, privacy controls and cohort suppression. Public aggregates must not expose personal identities, private adaptation notes or raw free-text responses.

## Minimum useful tower and product presentation

The minimum useful starting point remains one goal, two relevant protocols and one outcome; grow from there. Two is an onboarding target, not a maximum or a reason to recommend irrelevant protocols. Initial setup and later expansion should support substantial protocol stacks.

Present goals/systems, protocols/treatments and outcomes/measurements in terms users understand. Technical storage roles must not obscure what was done, what changed, or how success is evaluated. Preserve the core pattern in future APIs, discovery formats, agent workflows and analytics.
