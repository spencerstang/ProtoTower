# ADR: pnpm monorepo with Turborepo

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Use pnpm workspaces for deterministic dependency isolation and Turborepo for task orchestration and caching.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
