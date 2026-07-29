# Dependency rationale

Milestone 1 intentionally keeps the dependency surface small and pins direct dependencies to exact versions. Transitive versions will become reproducible when `pnpm-lock.yaml` is generated in an environment with working registry access.

## Runtime dependencies

| Dependency | Used by | Reason |
| --- | --- | --- |
| `next`, `react`, `react-dom` | `apps/web` | Required application framework and rendering runtime for the authoritative Next.js App Router architecture. |
| `zod` | web, configuration, validation | Runtime validation for environment variables and future untrusted external inputs. It prevents TypeScript types from being mistaken for runtime validation. |
| `@opennextjs/cloudflare` | `apps/web` | Converts the Next.js build into a Cloudflare Workers artifact while keeping the application itself on standard Next.js APIs. |
| `@protostack/configuration`, `@protostack/ui` | `apps/web` | Internal workspace packages for provider-neutral configuration, logging, feature flags, and reusable UI primitives. |

## Development and delivery dependencies

| Dependency | Reason |
| --- | --- |
| `pnpm`, `turbo` | Workspace package management and task orchestration for the required monorepo. |
| `typescript`, `@types/*` | Strict static typing and platform/framework declarations. |
| `eslint`, `eslint-config-next`, `prettier` | Framework-aware linting and deterministic formatting. |
| `vitest`, `@vitest/coverage-v8` | Fast unit-test and coverage foundation across the application and packages. |
| `@playwright/test`, `@axe-core/playwright` | Browser, accessibility, security-header, and performance test foundations. |
| `supabase` | Version-controlled local PostgreSQL migrations, seeds, database linting, generated types, and pgTAP tests. It is a development tool, not a domain dependency. |
| `wrangler` | Local preview, type generation, and deployment of the OpenNext Worker. |

## Deliberately absent

Milestone 1 adds no authentication client, AI SDK, analytics SDK, email SDK, payment SDK, logging vendor, ORM, queue, or Cloudflare-only domain library. Those dependencies require a later milestone, an explicit interface boundary, and documented justification.
