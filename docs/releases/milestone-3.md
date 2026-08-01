# Milestone 3: authenticated personal towers

Milestone 3 adds an invite-only authenticated alpha without changing the public
catalog boundary. An invited user can deliberately confirm a one-time email link,
create several private towers for different goals, and arrange exact published
protocol versions within each tower.

The release includes server-only Supabase sessions, a scanner-resistant confirmation
step, a nonce-based production script CSP, private no-store responses, provider-neutral
authorization and tower packages, forced PostgreSQL RLS, direct-write denial, bounded
revision-checked RPCs, local SMTP coverage, and two-browser-user isolation tests.

It does not enable public signup, profiles, notes, adherence, outcomes, social
features, AI, payments, ProtoTower.ai production DNS, or Milestone 4 work.
