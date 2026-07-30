# Milestone 2 validation record

Validation date: 2026-07-29

Accepted application commit: pending final gate

Staging URL: <https://protostack-web-staging.spencer-4e6.workers.dev>

Successful deployment: pending final gate

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

Populate this section after the protected workflow applies committed migrations and
synthetic seeds, deploys the accepted Git SHA, and verifies health, protected build
metadata, catalog listing visibility, latest-version detail content, and exclusion of
draft and retired records.

The first protected run deployed the application successfully but exposed a brittle
raw-HTML assertion: React streamed the visible `Version 2` text with an internal
comment separator. Public inspection confirmed the v2-only step and all other
content. The verifier now uses that stable v2-only step as its latest-version marker.

## Visual review

The local landing page, catalog, and detail layouts were reviewed on 2026-07-29 at
desktop width and at a 390×844 mobile viewport. The layouts had no horizontal
overflow, the catalog cards collapsed to one column, safety content remained
prominent, and browser console inspection reported no warnings or errors. Repeat
this review against the accepted staging commit before completing this record.

## Rollback review

The application rollback remains a known-good Worker redeployment. Database
migrations remain forward-only; catalog corrections use compensating migrations and
higher immutable protocol versions. No destructive rollback is authorized by this
milestone.
