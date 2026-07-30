# Milestone 2 validation record

Validation date: 2026-07-29

Accepted application commit:
`4642fb35bf193a41b550ba5667b28e507b25efd0`

Staging URL: <https://protostack-web-staging.spencer-4e6.workers.dev>

Successful deployment:
<https://github.com/spencerstang/Protostack/actions/runs/30510134006>

## Local verification

The following checks passed on the completed local source:

- `CI=true pnpm install --frozen-lockfile`
- `CI=true pnpm verify`
  - formatting and repository structure
  - dependency policy and secret scanning
  - forward-migration validation
  - lint and strict type checking across all 13 packages
  - all 37 unit tests
  - all package builds and the optimized Next.js production build
- `CI=true pnpm audit --audit-level=high --prod`
  - no known vulnerabilities
- `CI=true pnpm db:reset`
  - clean recreation, both migrations, and both synthetic seed files
- `CI=true pnpm db:lint`
  - no schema errors
- `CI=true pnpm db:test`
  - all 22 pgTAP assertions across both test files
- `CI=true pnpm playwright:install`
- `CI=true pnpm test:browsers`
  - all 13 end-to-end, accessibility, security, unavailable-state, and
    performance tests
- Wrangler JSONC parser validation
- `bash -n scripts/bootstrap.sh`
- `git diff --check`

The final local gate used Node.js `v25.9.0` and pnpm `11.17.0`. GitHub Actions will
repeat the gate with Node.js `22.16.0` and pnpm `11.17.0`.

## Protected staging verification

The protected staging workflow completed successfully for the accepted application
commit:

- `validate / verify` passed in 1 minute 21 seconds, including a frozen install and
  the complete `pnpm verify` gate on Node.js `22.16.0`.
- `migrate` passed in 18 seconds after linking the protected Supabase project and
  applying the committed migrations plus deterministic synthetic seeds.
- `deploy-web` passed in 1 minute 4 seconds after building the OpenNext Worker,
  uploading its protected runtime secrets, deploying the Worker, and verifying the
  staging endpoints.

Independent checks against the public staging URL confirmed:

- `/api/health` returned `status: ok`;
- `/protocols` rendered all three active protocols and the latest published
  `Morning outdoor cue` version;
- the unpublished `Unpublished evening revision` and retired
  `Retired synthetic routine` were absent;
- `/protocols/morning-light-routine` rendered the v2-only
  `Pick a repeatable cue` step and the general-education disclaimer; and
- the superseded `Morning light routine` v1 title was absent from the detail page.

The first protected run deployed the application successfully but exposed a brittle
raw-HTML assertion: React streamed the visible `Version 2` text with an internal
comment separator. Public inspection confirmed the v2-only step and all other
content. The verifier now uses that stable v2-only step as its latest-version marker.
The corrected run above passed without changing application behavior. The first run
is retained as corrective-work evidence at
<https://github.com/spencerstang/Protostack/actions/runs/30509511452>.

The successful run emitted a non-blocking GitHub Actions annotation that
`cloudflare/wrangler-action@v3` still targets the deprecated Node.js 20 action
runtime; GitHub forced the action to Node.js 24 and the deployment passed.

## Visual review

The local and deployed staging landing page, catalog, and detail layouts were
reviewed on 2026-07-29 at 1280×720 desktop width and at a 390×844 mobile viewport.
Both staging viewports had no horizontal overflow, the mobile catalog cards
collapsed to one column, safety content and the education disclaimer remained
prominent, and staging browser console inspection reported no warnings or errors.

## Rollback review

The application rollback remains a known-good Worker redeployment. Database
migrations remain forward-only; catalog corrections use compensating migrations and
higher immutable protocol versions. No destructive rollback is authorized by this
milestone.
