# ProtoStack permanent AI coding rules

These rules are authoritative for every future AI coding session in this repository.

## Scope and architecture

- Build a production application, never a mockup.
- Preserve the modular monolith: one deployable application with domain rules in packages.
- Do not introduce microservices, Kubernetes, distributed queues, or provider-specific domain logic without an approved ADR.
- Keep Next.js route and React components thin. Important business logic belongs in domain packages.
- Maintain a credible path to standard Node.js or Docker hosting.
- The core application must continue to start and serve basic routes when AI, analytics, email, or optional integrations are unavailable.
- Do not begin work outside the active milestone.

## TypeScript and validation

- Keep TypeScript strict mode enabled.
- Do not use `any`. External and untrusted data begins as `unknown`.
- Validate environment variables, request input, provider responses, file content, and serialized payloads before use.
- Prefer explicit immutable types and narrow unions over broad objects.
- Do not weaken compiler or lint rules to make a change pass.

## Data, privacy, and security

- Use synthetic development and test data only.
- Never copy production records, personal identifiers, health data, credentials, tokens, or customer content into the repository, logs, fixtures, screenshots, prompts, or chat.
- Do not invent secrets. Add placeholder names to examples and document where a human must configure the real value.
- Log only operational metadata. Redact credentials and sensitive fields by default.
- Authorization is deny-by-default. Administrative endpoints must be hidden or authenticated outside local development.
- All database changes use reviewed, forward-only migrations. Seeds contain data only.
- Never claim a deployment, migration, backup, restore, or external verification succeeded unless it was actually run and observed.

## Dependencies and provider boundaries

- Explain every new dependency in the pull request or adjacent ADR.
- Prefer standard platform APIs and small internal abstractions when they are sufficient.
- Keep Cloudflare, Supabase, AI, analytics, notification, and payment code behind interfaces.
- Do not let domain packages import provider SDKs.
- Do not add AI, analytics, email, payment, or authentication SDKs before the milestone that owns them.

## Testing and completion

- Add unit tests for domain logic, validation, feature flags, redaction, and security decisions.
- Add browser tests for user-visible flows, accessibility, security headers, and critical performance budgets.
- Add pgTAP or equivalent tests for database behavior.
- Run formatting, linting, strict type checking, unit tests, build validation, migration checks, dependency scanning, and secret scanning before declaring work complete.
- Record exact commands and truthful results in the handoff.
- If an external tool is unavailable, state the limitation and run every check that is available locally.

## Documentation

- Update the README, operations docs, security docs, release notes, and ADRs when behavior or architecture changes.
- Keep rollback and troubleshooting steps current.
- Leave clear human steps for external accounts, DNS, secrets, and environment protection rules.

## Required project context and autonomous execution

At the start of every AI coding session, read `docs/PROJECT-CONTEXT.md` alongside this file, the README, and the active milestone/runbooks. The context file is a maintained project handoff, not permission to override these rules, expand a milestone, or deploy.

The owner prefers maximum reasonable agent autonomy: inspect the repository and GitHub checks, choose the smallest safe next step, code and test on a separate branch, open/update a pull request, and continue through routine non-production tasks without repeated approval requests. Maintain a clear status of completed work, unresolved tests, external blockers, and the exact next action. Ask for human intervention only when truly needed for credentials, permissions, spending, significant product or architectural decisions, protected deployments, production data, or DNS. Never claim unattended or continuing execution unless an actual scheduled/background execution facility was configured.

Treat all GitHub checks as point-in-time evidence. Refresh PR/CI and staging status before making release decisions; failed or skipped browser checks are not release acceptance.
