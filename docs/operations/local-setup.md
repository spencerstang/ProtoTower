# Local setup

## Prerequisites

Install Node.js 22.16+, pnpm 11.17, and Docker Desktop or another Docker-compatible engine. Docker must be running before local Supabase starts.

## Commands

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm db:reset
pnpm dev
```

Open `http://127.0.0.1:3000`. Use `pnpm db:status` to retrieve the local Supabase URLs and anonymous key, then place only the anonymous key in `.env.local`. Never commit `.env.local`.

`pnpm db:reset` applies all forward migrations and loads deterministic synthetic
catalog records. `/protocols` shows a scoped unavailable state when the Supabase URL
and anonymous key are omitted or unreachable; `/` and `/api/health` remain
independent.

The repository uses exact direct dependency versions and a committed lockfile.
Acceptance and CI use `CI=true pnpm install --frozen-lockfile`.

## Verification

```bash
pnpm verify
pnpm audit --audit-level=high --prod
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

## Optional Cloudflare-local preview

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm --filter @protostack/web preview
```

The standard `pnpm dev` path remains the fastest local application loop and does not require Cloudflare credentials.
