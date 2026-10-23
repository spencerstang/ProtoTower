# ADR: Tower setup and recurring check-ins

- Status: Accepted for the tower product model
- Date: 2026-10-23

## Context

A tower previously stored a title and pinned published protocol versions. Practice
check-ins recorded only that a pinned version was marked on a date. The product model
asks for a short setup — name, protocols, outcomes, rhythm, and visibility — and one
check-in form for every cadence.

Published catalog rows stay immutable. Outcome values such as weight and blood pressure
are private owner data and must not become analytics, medical claims, or shared reads.

## Decision

- Keep `create_personal_tower`, catalog pins, and practice check-ins. Add a configured
  create and a setup save beside them.
- Copy a protocol onto the tower. Store the published id and version only as provenance.
  Editing the copy does not change the catalog.
- Store outcome metrics on the tower: ongoing, proxy, and final. Require one final once
  the tower has protocols or metrics. Ongoing and proxy stay optional.
- Use one check-in per tower and period. Collect ongoing values, then completion for
  final and proxy metrics. A blank ongoing or proxy value is a skip. Unchecked protocol
  marks are omitted.
- Calculate the period in both the domain package and `app_private.tower_period_start`.
  Weekly starts Monday. Custom dates open only on a listed date.
- Save audience and identity as owner preferences. Private always stores named identity.
  Shared does not grant another account `SELECT`.
- Deny direct writes. Mutations go through fixed-search-path RPCs. Readings are not logged.
- Show the check-in summary from stored readings. The summary is calm and is not a score,
  streak, or clinical interpretation.
- The first create accepts 1–3 protocols. Later edits accept up to the existing tower cap.

## Consequences

Removing a protocol or metric deletes its check-in rows through foreign keys. That is a
v1 limitation; history is not retained after removal.

Sharing delivery, reminders, and cross-user reads stay out of this change. The saved
audience is a preference until a later decision grants access.

Weight and blood pressure are accepted because the product model includes them. They
remain private owner data, are excluded from operational logs, and are not medical advice.
