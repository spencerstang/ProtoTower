# ADR: Provider-neutral read-only protocol catalog

- Status: Accepted
- Date: 2026-07-29

## Context

Milestone 2 needs a public catalog that proves a real product path without adding
authentication, authoring, personal data, or provider coupling. Published content
must not change silently, and an optional database outage must not take down the
application.

## Decision

- Keep protocol identity, slug, version, step, caution, reference, and response
  validation in `@protostack/protocol-engine`.
- Store stable identities and versioned content in PostgreSQL with forward-only
  migrations.
- Make rows immutable after publication. Revisions receive a higher version.
- Use RLS, explicit grants, security-definer policy helpers, and a
  security-invoker view to expose only the latest published version of active
  protocols to anonymous and authenticated roles.
- Place a standard Fetch API PostgREST adapter in `apps/web`. Do not add the
  Supabase runtime SDK or import provider code into a domain package.
- Return a typed unavailable result when configuration, transport, status, or
  response validation fails. Do not propagate provider error bodies.
- Keep `/`, `/api/health`, and error handling independent from the catalog.

## Consequences

The catalog is portable to another PostgreSQL/PostgREST-compatible edge or to a new
adapter implementing the same repository interface. Anonymous access is deliberately
read-only. Publishing workflows, authentication, personal towers, and tracking
remain outside this ADR and require later milestones.
