# Milestone 2 scope: read-only versioned protocol catalog

## Outcome

Milestone 2 delivers ProtoTower's first product vertical slice: visitors can browse a
small synthetic catalog of published wellness protocols and open an immutable
published version. The catalog remains useful without authentication, does not
collect personal data, and fails independently from the landing page and liveness
endpoint when the optional database boundary is unavailable.

ProtoTower is the public brand and ProtoTower.ai is the reserved future production
domain. Existing ProtoStack repository and package identifiers stay unchanged in
this milestone.

## In scope

- Provider-neutral protocol identity, slug, version, step, caution, and reference
  rules in `@protostack/protocol-engine`
- Runtime validation for all protocol data entering from PostgreSQL/PostgREST
- Forward-only PostgreSQL schema, indexes, constraints, comments, RLS, grants, and
  immutable-publication enforcement
- Deterministic synthetic catalog seeds
- Anonymous read access to active protocols and published versions only
- A standard `fetch` PostgREST adapter at the web application edge
- Public `/protocols` and `/protocols/[slug]` routes
- Accessible loading, empty, unavailable, and not-found states
- Unit, pgTAP, browser, accessibility, security, and performance tests
- Updated architecture, threat-model, operations, and release documentation

## Explicitly out of scope

- Authentication, accounts, profiles, or saved user state
- Protocol authoring, editing, publishing, or administrative UI
- User-generated content or production health records
- Personal stacks, adherence tracking, measurements, or outcomes
- Medical diagnosis, individualized treatment, or clinical recommendations
- AI execution, aggregate analytics, notifications, email, payments, and MCP

## Product and safety rules

- All development, test, seed, and screenshot content is synthetic.
- Catalog content is general educational wellness information, not medical advice.
- Published protocol versions are immutable. A revision creates a higher version.
- Version numbers are positive integers and unique within a protocol.
- Slugs are stable, lowercase, URL-safe identifiers.
- Each version contains at least one ordered step and one safety caution.
- External references use HTTPS and are descriptive; the catalog makes no claim that
  a reference proves a protocol's effectiveness.
- Anonymous access is read-only and restricted to active protocols with published
  versions. Database writes remain denied.
- A catalog outage cannot break `/`, `/api/health`, or core error handling.

## Acceptance criteria

1. A clean database reset creates the catalog schema and deterministic synthetic
   records without warnings.
2. pgTAP proves constraints, anonymous read boundaries, denied writes, and published
   version immutability.
3. Domain tests cover valid records and reject malformed slugs, unordered or
   duplicate steps, unsafe reference URLs, missing cautions, and invalid versions.
4. The provider adapter validates unknown responses before returning domain values
   and returns a typed unavailable result without leaking provider errors.
5. The catalog lists only the latest published version for each active protocol.
6. A protocol detail route returns the latest published version by slug and uses a
   normal not-found state for unknown or unpublished records.
7. The landing page links to the catalog while liveness remains dependency-free.
8. Browser tests cover catalog listing, detail navigation, accessibility, security
   headers, database-unavailable behavior, and the established performance budget.
9. `pnpm verify`, the production dependency audit, Supabase reset/lint/pgTAP, and all
   Playwright projects pass.
10. The protected staging workflow applies migrations, deploys the accepted commit,
    and verifies public health plus protected build metadata.
