# ADR: Modular monolith

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Use one deployable application with domain packages. This minimizes operational complexity while preserving explicit boundaries and future extraction options.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
