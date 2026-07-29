# ADR: Cloudflare Workers through OpenNext

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Deploy the Next.js application to Workers through OpenNext while avoiding Workers-only domain code and preserving Node/Docker portability.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
