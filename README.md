# ProtoTower

ProtoTower is a model-neutral wellness product for assembling understandable
protocols into a durable tower of great habits. The codebase retains the ProtoStack
repository and `@protostack/*` package names to avoid an unnecessary internal rename.
The public product name and future production domain are **ProtoTower** and
**ProtoTower.ai**.

This repository contains the **Milestone 4: private practice check-ins**
implementation for the invite-only synthetic alpha. Users can record and undo one
bounded calendar-date check-in for an exact protocol version inside an owner-isolated
tower. ProtoTower.ai is reserved but is not connected to a production deployment.

## What is included

- pnpm/Turborepo modular monolith
- Next.js App Router application with strict TypeScript
- provider-neutral protocol rules and runtime validation
- immutable published versions with anonymous read-only PostgreSQL policies
- deterministic synthetic wellness examples and generated database types
- a fetch-based PostgREST adapter that fails independently from core routes
- public `/protocols` and `/protocols/[slug]` experiences
- scanner-resistant Supabase Auth email links with server-only `HttpOnly` sessions
- multiple private goal towers with exact protocol-version pinning and revisions
- bounded private practice check-ins with exact-version history and idempotent undo
- forced RLS, direct-write denial, bounded RPCs, and two-user isolation coverage
- local Supabase migrations, schema lint, and pgTAP security tests
- Cloudflare Workers deployment through OpenNext
- quality, browser, accessibility, security, performance, dependency, and secret
  gates

Public registration, password authentication, protocol authoring or publishing UI,
outcomes, scores, streaks, notes, AI, analytics, non-authentication notifications,
payments, and MCP remain disabled. Milestone 4 does not authorize real-user data
collection or a public production launch.

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
pnpm db:reset
pnpm dev
```

Use `pnpm db:status` to obtain the local anonymous key, then place that public local
value in `.env.local`. Open <http://127.0.0.1:3000>.

## Verification

```bash
CI=true pnpm verify
pnpm audit --audit-level=high --prod
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

Read `AGENTS.md` before an AI-assisted coding session. Local operations are in
`docs/operations/local-setup.md`, staging delivery is in
`docs/operations/staging-deployment.md`, and the Milestone 4 acceptance gate is in
`docs/operations/milestone-4-gate.md`.
