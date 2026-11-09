# Starter check-ins and reminders

Starter towers store the private answer to one question, pins to published protocol
versions, one outcome label, weekly practice marks, and weekly outcome notes.

- Direct table writes are revoked. Create, practice, outcome, and opt-out go through
  fixed-search-path RPCs.
- `record_starter_adherence` writes only `starter_adherence`.
  `record_starter_outcome` writes only `starter_outcome_readings`.
- Row level security is forced. Another account cannot read or write the rows.
- Practice marks and outcome notes are not logged.
- The opt-out token is an unguessable UUID. The public opt-out RPC sets a boolean and
  does not return an email address or tower content.
- Reminder claim functions are not executable by `anon` or `authenticated`. The send
  log stores an owner and a week, not an address.
- `weeklyCheckInReminders` defaults off. Reminder construction rejects every recipient
  that does not end in `.invalid`. The job route returns without sending.

Account deletion still cascades from `auth.users` through towers, check-ins, reminder
preferences, and the send log.
