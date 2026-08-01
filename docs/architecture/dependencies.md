# Dependency rationale

Milestone 3 keeps the dependency surface small, pins direct external dependencies to
exact versions, and checks the frozen lockfile in every acceptance environment.

## Runtime dependencies

| Dependency                                                                      | Used by                                    | Reason                                                                                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next`, `react`, `react-dom`                                                    | `apps/web`                                 | Application framework and rendering runtime for the authoritative Next.js App Router architecture.                                   |
| `zod`                                                                           | configuration, validation, protocol engine | Runtime validation for environment variables and untrusted protocol values. TypeScript types alone cannot validate runtime input.    |
| `@protostack/configuration`, `@protostack/protocol-engine`, `@protostack/ui`    | `apps/web`                                 | Internal provider-neutral configuration, protocol, logging, feature-flag, and UI boundaries.                                         |
| `@opennextjs/cloudflare`                                                        | `apps/web`                                 | Converts Next.js into a Cloudflare Workers artifact without introducing Workers-specific domain logic.                               |
| `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.111.0                         | `apps/web`                                 | Server-only magic-link, cookie-session, verified-claims, and user-scoped PostgREST adapter. Provider types remain at the web edge.   |
| `@protostack/authorization`, `@protostack/database`, `@protostack/tower-engine` | `apps/web`                                 | Provider-neutral identity, generated provider typing, ownership, private-title, ordering, limit, revision, and repository contracts. |

The catalog adapter continues to use the standard Fetch API. Milestone 3 pins the
Supabase runtime SDKs only for the reviewed Auth/session and user-scoped tower edge;
it adds no ORM or general database library. `@supabase/ssr` is beta, so its exact
version and OpenNext behavior are acceptance-gated.

## Development and delivery dependencies

| Dependency                                 | Reason                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm`, `turbo`                            | Workspace package management and task orchestration.                                                                                                            |
| `typescript`, `@types/*`                   | Strict static typing and platform/framework declarations.                                                                                                       |
| `eslint`, `eslint-config-next`, `prettier` | Framework-aware linting and deterministic formatting.                                                                                                           |
| `vitest`, `@vitest/coverage-v8`            | Unit tests and coverage infrastructure.                                                                                                                         |
| `@playwright/test`, `@axe-core/playwright` | Browser, accessibility, security-header, unavailable-state, and performance testing.                                                                            |
| `supabase`                                 | Version-controlled PostgreSQL migrations, synthetic seeds, database linting, generated types, and pgTAP tests. It is delivery tooling, not a domain dependency. |
| `wrangler`                                 | Local preview, type generation, and OpenNext Worker deployment.                                                                                                 |

## Deliberately absent

Milestone 3 adds no AI SDK, analytics SDK, general email SDK, payment SDK, logging
vendor, ORM, queue, or Cloudflare-only domain library. Authentication email remains
inside Supabase Auth. Other capabilities require a later approved milestone and
explicit provider boundary.
