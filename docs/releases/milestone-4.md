# Milestone 4: private practice check-ins

Milestone 4 completes the invite-only alpha's first private practice loop. An
authenticated user can record or undo one calendar-date check-in for an exact
protocol version in an owned tower and review bounded recent history. Removing a
current block preserves its history; deleting the tower or Auth account removes the
owned history through database cascades.

The release uses provider-neutral domain rules, the existing server-only Supabase
edge, a narrowly reviewed fixed-search-path RPC, direct-write denial, forced RLS,
strict provider parsing, private no-store responses, and synthetic multi-user tests.
A check-in means only what its owner chose to record. It is not adherence, efficacy,
completion proof, a score, or a health outcome.

No new external runtime dependency or provider account is introduced. Public signup,
notes, streaks, outcomes, analytics, reminders, AI, payments, MCP, real-user data
collection, and production-domain launch remain outside the approved boundary.
