# Staging deployment

Staging uses a protected GitHub environment and the manually triggered
`Deploy Staging` workflow. The workflow validates the repository, optionally applies
committed migrations and idempotent synthetic seeds, builds the OpenNext Worker,
uploads runtime secrets, deploys the staging Worker, and verifies health, protected
build identity, catalog visibility, and the latest protocol version.

## Current staging configuration

- GitHub environment: `staging`, protected by a required reviewer
- Cloudflare Worker URL:
  <https://protostack-web-staging.spencer-4e6.workers.dev>
- Supabase project: dedicated staging project with synthetic data only
- Public product brand: ProtoTower
- Reserved production domain: ProtoTower.ai, not connected by Milestone 4
- Code owner: `@spencerstang`
- Cloudflare token scope: account-level Workers Scripts Write only
- Cloudflare token rotation deadline: 2026-10-27
- Supabase access-token rotation deadline: 2026-08-28

The GitHub environment contains these secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_DIAGNOSTICS_TOKEN`

`PUBLIC_APP_URL` is an environment variable. `SUPABASE_ANON_KEY` is safe for
anonymous browser use but remains environment-scoped to prevent configuration drift.
Never copy any values into documentation, logs, issues, or chat.

## Deployment

Run **Deploy Staging** from GitHub Actions. Leave `deploy_database` enabled unless
intentionally deploying web-only changes after confirming migrations and synthetic
catalog seeds are already current.

The workflow:

1. repeats the full repository verification gate;
2. links the dedicated staging project;
3. runs `supabase db push --include-all --include-seed`;
4. builds the dynamic catalog routes;
5. uploads the diagnostics token plus catalog URL and anonymous key to the staging
   Worker;
6. deploys through the protected environment;
7. verifies `/api/health`, authenticated build metadata, `/protocols`, and
   `/protocols/huberman-daily-sleep-wake-blueprint`.

The catalog checks require all four permanent attributed protocols, reject the
obsolete synthetic catalog and unpublished/retired seed content, and confirm the
educational disclaimer.

Before authenticated staging acceptance, an operator must enable the email provider,
keep new-user signup disabled, provision only designated test accounts, install the
committed scanner-resistant magic-link template in the hosted Auth settings, and set
an exact Site URL/redirect allowlist. Do not put the mailbox or message content in
the repository or workflow logs.

For Milestone 4, apply the forward-only private-practice migration and complete the
schema plus rollback checks before deploying an application revision with
`protocolTracking` enabled. No new staging secret or provider account is required.
Use only the two designated synthetic accounts, verify owner isolation and private
no-store responses, and remove test accounts through the approved operator flow after
acceptance.

A human must still inspect the deployed public and private layouts. Record the
accepted commit, deployment URL, workflow run, exact results, and rollback review in
`docs/releases/milestone-4-validation.md`.
