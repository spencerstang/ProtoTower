# Milestone 1 validation record

Validation date: 2026-07-29

Accepted application commit: `49bba8b`

Staging URL: <https://protostack-web-staging.spencer-4e6.workers.dev>

Successful deployment: [GitHub Actions run 30484202192](https://github.com/spencerstang/Protostack/actions/runs/30484202192)

## Local verification

The following checks passed against the completed Milestone 1 repository:

- `CI=true pnpm install --frozen-lockfile`
- `CI=true pnpm verify`
  - formatting
  - repository policy
  - dependency policy and audit
  - secret scanning
  - migration validation
  - linting
  - strict type checking
  - unit tests
  - production builds
- `pnpm db:reset`
  - local Supabase reset and seeds
  - schema lint
  - all 4 pgTAP database tests
- `pnpm test:browsers`
  - all 6 browser, accessibility, security-header, and performance tests
- JSONC parsing for the staging Wrangler configuration
- `bash -n scripts/bootstrap.sh`

The final local verification used Node.js `v25.9.0` and pnpm `11.17.0`. GitHub Actions repeated the gate with the repository-pinned pnpm version and Node.js `22.16.0`.

## Protected staging verification

The `staging` GitHub environment has a required reviewer and environment-scoped deployment credentials. Run `30484202192` completed all three protected jobs:

1. `validate / verify` passed with a frozen lockfile install and the full `pnpm verify` gate.
2. `migrate` linked the dedicated synthetic-data Supabase staging project and successfully applied all committed forward-only migrations.
3. `deploy-web` built the OpenNext Worker, uploaded the administrative diagnostics token specifically to the staging Worker, deployed to Cloudflare, and passed its automated public and authenticated endpoint checks.

Independent post-deployment checks confirmed:

- the landing page loaded successfully and was visually reviewed;
- `GET /api/health` returned HTTP 200 with `status: "ok"`;
- unauthenticated `GET /api/admin/build-info` returned HTTP 404;
- the workflow's authenticated build-info check matched the deployed Git SHA;
- no real user data was introduced.

## Corrective work completed during acceptance

- Updated deprecated local Supabase email configuration from `[inbucket]` to `[local_smtp]`.
- Replaced placeholder code owners with `@spencerstang`.
- Required frozen lockfile installs in CI, staging deployment, reusable verification, and bootstrap flows.
- Replaced strict JSON parsing of `wrangler.jsonc` with TypeScript's JSONC parser.
- Corrected Cloudflare secret upload so the administrative token targets the staging Worker explicitly.
- Replaced invalid browser-transferred provider tokens without logging or committing their values.
- Pinned patched `sharp` and `postcss` transitive versions after the registry
  published new high-severity advisories during final acceptance.
- Retried protected build diagnostics through Cloudflare propagation so a
  successful deployment cannot fail the gate on a briefly stale edge response.

## Rollback review

The documented rollback path was dry-run reviewed. Web rollback can redeploy the last known-good commit. Database changes remain forward-only; a corrective migration must be prepared instead of reversing an applied migration. No destructive rollback was required.
