# Cloudflare Worker startup compatibility

Next.js 16.4 exposed two startup incompatibilities in OpenNext 1.19.11.
OpenNext 1.20.12 with Wrangler 4.148.0 replaces the insufficient manifest backport.
Both deployment workflows use the same reviewed Wrangler version. These remain
build dependencies behind the existing provider boundary.

CI builds and starts the real Worker and requires its health route to return ok.
Commit cdd3a14 passed the complete CI run 44812760023 on 2026-11-20: formatting,
repository and dependency policy, secrets, migrations, lint, strict types, unit
tests, builds, Worker startup, 26 browser tests and 211 database assertions.
Separate dependency review still identified undici advisories in build tooling.

The release pins existing transitive dependencies to patched versions:

- glob 10.3.3 to 10.5.0
- undici 7.29.1 to 7.30.2
- brace-expansion 1.1.16 to 1.1.21 and 5.0.8 to 5.0.12
- Vite 8.1.5 to 8.1.6

The permanent audit now includes development and build dependencies as well as
production dependencies. No advisory or required check is suppressed. Independent
registry resolution in run 44817420142 produced the same canonical dependency graph
as the locally reviewed candidate. Its complete audit reported 12 moderate findings
and no high or critical findings. The temporary diagnostic jobs have been removed.
Normal quality and deployment jobs retain frozen installs. The corrected lockfile
still requires committing and fresh exact-head acceptance before merge.

Deploy through the protected staging and production processes. Verify health,
accepted build SHA, catalog and authenticated behavior. Upload success alone does
not establish runtime health. Roll back to the previous accepted Worker version
using the rollback runbook; database recovery remains forward-only. No new token
privilege is introduced by these dependency changes.
