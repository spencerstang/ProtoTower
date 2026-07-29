# ADR: CI and security gates

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Require formatting, linting, strict type checking, unit tests, build validation, browser tests, migration tests, dependency review, audit, and secret scanning before staging deployment.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
