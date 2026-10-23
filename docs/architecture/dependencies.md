# Dependency rationale

The production application keeps the dependency surface small, pins direct external
dependencies to exact versions, and checks the frozen lockfile in every acceptance
environment.

The October 23, 2026 security refresh pins Next.js and its ESLint configuration to
16.4.2, the newest patched 16.4 release that already satisfies the 24-hour minimum
release age. `@opennextjs/cloudflare` 1.19.11 accepts `next` `>=16.2.6`, so this
stays on the current OpenNext adapter. The same refresh keeps the `sharp` 0.35.5 and
`source-map-js` 1.2.2 overrides. These patch updates address GHSA-2464-fhr4-w9xw and
the related Next.js remote-code-execution and denial-of-service advisories in
`>=16.0.0 <=16.4.0`, plus the earlier image-optimization SSRF, librsvg, and
indexed-source-map advisories, without adding a new product capability or provider.
The production dependency audit reports no known high or critical vulnerabilities
after the refresh.

## Runtime dependencies

| Dependency                                                                      | Used by                                                                    | Reason                                                                                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`, `react`, `react-dom`                                                    | `apps/web`                                                                 | Application framework and rendering runtime for the authoritative Next.js App Router architecture.                                          |
| `zod`                                                                           | configuration, validation, protocol, outcomes, tower, and tracking engines | Runtime validation for environment variables and untrusted domain/provider values. TypeScript types alone cannot validate runtime input.    |
| `@protostack/configuration`, `@protostack/protocol-engine`, `@protostack/ui`    | `apps/web`                                                                 | Internal provider-neutral configuration, protocol, logging, feature-flag, and UI boundaries.                                                |
| `@opennextjs/cloudflare`                                                        | `apps/web`                                                                 | Converts Next.js into a Cloudflare Workers artifact without introducing Workers-specific domain logic.                                      |
| `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.111.0                         | `apps/web`                                                                 | Server-only magic-link, cookie-session, verified-claims, and user-scoped PostgREST adapter. Provider types remain at the web edge.          |
| `@protostack/authorization`, `@protostack/database`, `@protostack/tower-engine` | `apps/web`                                                                 | Provider-neutral identity, generated provider typing, ownership, private-title, ordering, limit, revision, setup, and repository contracts. |
| `@protostack/outcomes-engine`                                                   | tower engine, tracking engine, `apps/web`                                  | Provider-neutral outcome presets, metric shapes, reading validation, and the calm check-in summary. No provider SDK.                        |
| `@protostack/tracking-engine`                                                   | `apps/web`                                                                 | Provider-neutral practice dates, exact-version check-ins, tower period math, query bounds, parsing, and mutation results.                   |

The catalog adapter continues to use the standard Fetch API. Milestone 4 reuses the
Supabase runtime SDKs only for the reviewed Auth/session and user-scoped web edge;
the private-practice adapter adds no external package, ORM, or general database
library. `@supabase/ssr` is beta, so its exact version and OpenNext behavior are
acceptance-gated.

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

Milestone 4 adds no AI SDK, analytics SDK, general email SDK, payment SDK, logging
vendor, ORM, queue, or Cloudflare-only domain library. Authentication email remains
inside Supabase Auth. Other capabilities require a later approved milestone and
explicit provider boundary.
