# ProtoStack

ProtoStack is an AI-native, model-neutral platform for self-directed adults to discover, combine, track, and evaluate health and wellness protocols. This repository currently contains **Milestone 1 only: repository and infrastructure foundation**.

## What is included

- pnpm/Turborepo modular monolith
- Next.js App Router application with strict TypeScript
- provider-neutral domain package boundaries
- local Supabase configuration, migrations, synthetic seeds, and pgTAP tests
- Cloudflare Workers deployment through OpenNext
- GitHub Actions for quality, browser, database, dependency, and secret checks
- public landing page, non-sensitive health endpoint, protected build diagnostics
- disabled-by-default feature flags, structured redacted logging, and error states

## Prerequisites

- Node.js 22.16 or a newer supported release below Node 27
- pnpm 11.17
- Docker Desktop or a compatible Docker engine for local Supabase

## Local setup

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm dev
```

Open `http://127.0.0.1:3000`. Supabase Studio is normally available at `http://127.0.0.1:54323`.

## Verification

```bash
pnpm verify
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

See `docs/operations/local-setup.md` for details and `AGENTS.md` before any AI-assisted coding session. The staging workflow and human account steps are documented in `docs/operations/staging-deployment.md`; the clean-checkout acceptance checklist is in `docs/operations/milestone-1-gate.md`.
