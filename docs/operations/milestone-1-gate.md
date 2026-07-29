# Milestone 1 gate checklist

A reviewer should execute this checklist from a clean checkout before approving the milestone.

## Repository and toolchain

- [ ] Node.js 22.16+ and pnpm 11.17 are active.
- [ ] `pnpm install` succeeds.
- [ ] `pnpm-lock.yaml` is generated, reviewed, and committed.
- [ ] CI and setup commands are changed to `pnpm install --frozen-lockfile` after the lockfile exists.
- [ ] `pnpm verify` passes without warnings or skipped tasks.

## Database

- [ ] Docker is running.
- [ ] `pnpm db:start` succeeds.
- [ ] `pnpm db:reset` applies all migrations and synthetic seeds.
- [ ] `pnpm db:lint` passes.
- [ ] `pnpm db:test` passes.
- [ ] No non-synthetic or production user data is present.

## Browser and runtime

- [ ] `pnpm playwright:install` succeeds.
- [ ] `pnpm test:browsers` passes.
- [ ] `/` is visually clean and usable at desktop and mobile widths.
- [ ] `/api/health` returns 200 without Supabase or optional providers.
- [ ] `/api/admin/build-info` is open only in local/preview.
- [ ] Staging diagnostics reject missing or incorrect bearer tokens with 404.

## Staging

- [ ] GitHub `staging` environment and reviewer protection are configured.
- [ ] Required Cloudflare and Supabase secrets are configured.
- [ ] `PUBLIC_APP_URL` is an HTTPS GitHub environment variable.
- [ ] `CODEOWNERS` contains the actual owner/team.
- [ ] The `Deploy Staging` workflow succeeds for the reviewed commit.
- [ ] The deployed landing page and health endpoint are verified manually.
- [ ] The protected build-info endpoint returns the expected version, SHA, build time, and environment.
- [ ] Rollback is exercised or dry-run reviewed against a prior known-good commit.

## Scope control

- [ ] No authentication, publishing, tracking, outcomes, payments, AI execution, analytics provider, notification provider, or MCP server was introduced.
- [ ] All future feature flags remain disabled.
- [ ] Architecture-review findings are resolved or accepted in writing.
