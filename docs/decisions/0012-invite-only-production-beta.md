# ADR 0012: invite-only production beta

- Status: Accepted
- Date: 2026-08-07

## Context

Milestone 4 completed the private practice loop on protected synthetic staging. A
production launch introduces real account identifiers, private tower titles, domain
traffic, backups, incident handling, email abuse, and public policy commitments even
when product functionality is unchanged.

## Decision

Launch first as an invite-only production beta on the canonical
`https://prototower.ai` origin. Keep self-service signup disabled and preserve the
Milestone 4 data boundary. Use separate production provider resources and a two-stage
release: deploy and verify the Worker before any custom-domain cutover, then require a
separate owner approval for DNS. Complete canonical-domain synthetic authentication
and accessibility acceptance before requiring a second approval for real-user
invitations.

Provide a plain-language privacy notice and a seven-calendar-day verified
operator-assisted deletion commitment. Require custom domain SMTP with tracking
disabled, provider and edge abuse controls, production backup/restore evidence,
incident and rollback runbooks, exact redirect allowlists, and human accessibility
review before admitting users.

## Consequences

- Production can be exercised safely before it receives canonical-domain traffic.
- The first beta remains operationally manual: account provisioning and deletion are
  operator-assisted.
- Public signup, self-service deletion/export, analytics, AI, outcomes, payments, and
  MCP remain blocked on later decisions.
- The owner must approve public policy language and final DNS/user admission; those
  commitments cannot be inferred from a successful software deployment.
