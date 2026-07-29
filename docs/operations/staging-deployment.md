# Staging deployment

Staging uses a protected GitHub environment and the manually triggered `Deploy Staging` workflow. The workflow validates the repository, optionally applies committed migrations, builds the OpenNext Worker, injects non-secret build metadata into the runner's temporary Wrangler configuration, uploads the administrative token as a Cloudflare Worker secret, deploys the staging Worker, and verifies both the public health endpoint and protected build SHA.

## Current staging configuration

- GitHub environment: `staging`, protected by a required reviewer
- Cloudflare Worker URL: <https://protostack-web-staging.spencer-4e6.workers.dev>
- Supabase project: dedicated staging project with synthetic data only
- Code owner: `@spencerstang`
- Cloudflare token scope: account-level Workers Scripts Write only
- Cloudflare token rotation deadline: 2026-10-27
- Supabase access-token rotation deadline: 2026-08-28

The GitHub environment contains `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, and `ADMIN_DIAGNOSTICS_TOKEN` as secrets. `PUBLIC_APP_URL` is an environment variable. Never copy their values into documentation, logs, issues, or chat.

## Deployment

Run **Deploy Staging** from GitHub Actions. Leave `deploy_database` enabled unless intentionally deploying web-only changes after confirming migrations are already current.

The workflow performs automated endpoint verification, but a human should still inspect the deployed landing page and confirm the hostname, health response, and protected build information documented in `health-checks.md`. Record the commit SHA, deployment URL, workflow run, and truthful results in the release record.

The Milestone 1 staging deployment and acceptance evidence are recorded in `docs/releases/milestone-1-validation.md`.
