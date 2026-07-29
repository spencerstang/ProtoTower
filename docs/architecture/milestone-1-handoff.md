# Milestone 1 architecture-review handoff

## Review scope

Review only the repository and infrastructure foundation. Authentication, protocol publishing, adherence tracking, outcomes, payments, AI execution, aggregate intelligence, and MCP behavior are deliberately out of scope and disabled.

## Architecture in one paragraph

ProtoStack is a pnpm/Turborepo modular monolith. `apps/web` is the only deployable application. Domain and provider-neutral contracts live in workspace packages, while deployment adapters remain at the application edge. Next.js App Router runs on Cloudflare Workers through OpenNext, with a documented portability path to standard Node.js or Docker. Supabase supplies local PostgreSQL tooling and a future hosted data boundary, but the public landing page and liveness endpoint do not require Supabase or any optional provider.

## Permanent invariants

- Strict TypeScript remains enabled; untrusted data begins as `unknown`.
- React components and routes remain thin; domain rules belong in packages.
- No domain package may import Cloudflare, Supabase, AI, analytics, notification, payment, or authentication SDKs.
- AI, analytics, notifications, and email are optional dependencies and cannot prevent core startup.
- Development, test, and seed data are synthetic only.
- Database changes are forward-only, version-controlled migrations.
- Administrative information is hidden or protected outside local and preview environments.
- Structured logs exclude secret values, direct identifiers, health fields, and error messages.
- All future product feature flags remain disabled until a later approved milestone.

## Runtime boundaries

- `/`: static public landing page.
- `/api/health`: dependency-free liveness response with a request ID and `no-store` caching.
- `/api/admin/build-info`: build metadata only. Open in local/preview; bearer-token protected in staging/production; unauthorized requests return 404.
- `/unavailable`, route error boundaries, global error boundary, and 404 page provide useful failure states.

## Data foundation

The initial migration creates only a private foundation metadata schema/table used to prove migration ordering and pgTAP execution. It does not implement product entities or store user health data. Seeds are deterministic and synthetic. Generated database types remain an empty placeholder until product tables are introduced through reviewed migrations.

## Deployment model

- Local application loop: Next.js development server plus local Supabase through Docker.
- Preview: explicit Wrangler preview environment and OpenNext preview command.
- Staging: manually triggered GitHub Actions workflow, protected GitHub environment, optional migration application, OpenNext build, Cloudflare Worker deployment, then manual endpoint verification.
- Production: configuration boundary exists, but no production deployment workflow or credentials are included in Milestone 1.

## Security posture to review

- Environment schema rejects incomplete Supabase settings, non-HTTPS protected URLs, short diagnostic tokens, and invalid build timestamps.
- Provider dependency policy blocks premature AI, analytics, notification, and payment SDKs and requires exact direct versions.
- Secret scanning runs both a repository-local pattern check and Gitleaks in CI.
- Baseline browser tests cover security headers, accessibility, and a conservative landing-page performance budget.
- Authorization package is deny-by-default, but authentication and product authorization are intentionally not implemented.

## Verification status

Repository-local structural, dependency-policy, secret-pattern, migration-order, configuration-syntax, workflow-YAML, shell-syntax, and dependency-free strict-TypeScript checks passed in the generation environment. The package registry was unavailable, so the declared dependency graph, project TypeScript 7 toolchain, Vitest, Next.js/OpenNext build, Playwright, and Supabase Docker checks were not executable there. No staging deployment was attempted.

## Highest-value review questions

1. Do package boundaries adequately prevent provider lock-in before product logic is added?
2. Is the diagnostics route sufficiently concealed and protected for staging?
3. Should the public health route remain pure liveness, with readiness added later as a separate protected endpoint?
4. Are major-tag GitHub Actions acceptable, or should third-party actions be pinned to immutable commit SHAs before production?
5. After the first successful install, does the generated lockfile resolve cleanly under Node 22.16 and pnpm 11.17?
6. Does the OpenNext build and Cloudflare preview behave correctly with the pinned Next.js version?
7. Does a clean Supabase reset apply the foundation migration, seed, lint, and pgTAP test without warnings?
