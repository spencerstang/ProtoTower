# ADR: Supabase PostgreSQL, Auth, and Storage

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Use Supabase as the initial managed platform, but keep domain rules and database contracts provider-neutral. Milestone 1 configures local services without implementing authentication.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
