# ADR 0016: One-question starter towers

- Status: Accepted for the starter path
- Date: 2026-11-09

## Context

The tower setup form asks the person to pick protocols and a final outcome before a
tower exists. The product direction is one question, an immediate tower, a reviewed
pair when one exists, and a later check-in that keeps practice separate from outcomes.

## Decision

- `/towers/new` asks "What would you like to accomplish?" and creates the tower on
  submit. The earlier setup form stays at `/towers/new/detailed` and is not required.
- A reviewed rule table maps a sentence to published protocol versions. Sleep language
  pins the Huberman and Johnson routines and says where they overlap. Training language
  pins only the Attia routine. Sauna is added only when that training sentence also
  mentions heat or sauna, and the published cautions are shown. Any other sentence
  creates the tower with no protocol, no measure, and no first action.
- The pair is an editorial selection of published routines. The rules do not store an
  effectiveness rank.
- Starter towers pin catalog versions in `personal_tower_items`. The first action is
  step 1 of the primary published routine.
- Weekly practice and the outcome note use different tables and different RPCs. Each
  RPC writes only its own table.
- `weeklyCheckInReminders` defaults off. The reminder text includes an opt-out link.
  The sender accepts only `.invalid` recipients. No email SDK is added. The job route
  does not send mail, because the application has no product email transport.

## Consequences

Unmatched goals produce an empty tower on purpose. Training-only goals have one
protocol. Real inboxes are not emailed by this change. Deploying it still requires
the protected production workflow, a working Supabase token for staging, and a
separate decision before any real reminder email is enabled.
