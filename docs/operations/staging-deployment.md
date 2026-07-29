# Staging deployment

Staging uses a protected GitHub environment and the manually triggered `Deploy Staging` workflow. The workflow validates the repository, optionally applies committed migrations, builds the OpenNext Worker, injects non-secret build metadata into the runner's temporary Wrangler configuration, uploads the administrative token as a Cloudflare Worker secret, deploys the staging Worker, and verifies both the public health endpoint and protected build SHA.

## Spencer must configure

1. Create a GitHub repository and push this code.
2. Create or select a Cloudflare account with Workers enabled.
3. Create a dedicated staging Supabase project containing synthetic data only.
4. Create the GitHub environment `staging` and require a reviewer for deployments.
5. Add GitHub environment secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, and a newly generated `ADMIN_DIAGNOSTICS_TOKEN`.
6. Add the GitHub environment variable `PUBLIC_APP_URL` after the staging hostname is known, including `https://` and no trailing path.
7. Replace `@OWNER_TO_BE_SET` in `.github/CODEOWNERS` with the actual GitHub owner or team.
8. Configure the Cloudflare API token with the minimum Workers deployment permissions needed for this account.

## Deployment

Run **Deploy Staging** from GitHub Actions. Leave `deploy_database` enabled unless intentionally deploying web-only changes after confirming migrations are already current.

The workflow performs automated endpoint verification, but a human should still inspect the deployed landing page and confirm the hostname, health response, and protected build information documented in `health-checks.md`. Record the commit SHA and deployment URL in the release record.

No external deployment was performed as part of repository generation because no Cloudflare, Supabase, or GitHub credentials were supplied.
