# Cloudflare Worker startup compatibility

Next.js 16.4 exposed two startup incompatibilities in OpenNext 1.19.11.
The preview-manifest backport was insufficient and is replaced by the released
OpenNext 1.20.12 adapter with Wrangler 4.148.0. These are existing provider-boundary
build dependencies; no domain package imports a provider SDK.

CI builds the real Worker and requires its health route to return status ok.
On 2026-11-20, commit ceae596 passed formatting, repository and dependency policy,
secret and migration checks, lint, strict types, unit tests, Node builds, Worker
build, Worker startup and production dependency audit in run 44804541985. The same
run passed all 26 browser tests and all 211 database assertions. Release-level
dependency review must also pass before merge.

Dependency review found GHSA-5j98-mcp5-4vw2 in transitive glob 10.3.3. The narrow
override to patched 10.5.0 addresses the advisory without suppressing the gate.
The changed lockfile requires review and a complete fresh CI run. The temporary
lockfile-preparation job must be removed before merge.

Staging and production deployment must use the same reviewed Wrangler version.
Verify health, exact build SHA, catalog and authenticated behavior through the
protected release process. A successful upload does not prove runtime health.
Roll back to the previous accepted Worker version using the rollback runbook;
database migrations remain forward-only. No new deployment token privileges
are required by this dependency change.
