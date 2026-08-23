# ADR 0014: Quiet-launch open beta

- Status: Accepted; supersedes the admission restriction in ADR 0012
- Date: 2026-08-23

## Context

The invite-only production plan added an operational admission step that no longer
fits the desired launch. ProtoTower still needs an honest beta posture and strong
privacy boundaries, but visitors should be able to create their own accounts without
waiting for an invitation.

## Decision

- Enable passwordless public account creation through the existing email-link flow.
- Keep email confirmation, scanner-resistant deliberate confirmation, exact redirect
  allowlists, server-only sessions, owner isolation, provider rate limits, and the
  protected production deployment gate.
- Send every requested account/sign-in link with a clear beta notice: ProtoTower is
  still being tested and some features are not functional yet.
- Label public pages as an open or quiet-launch beta and remove active invitation
  language from current product and operational controls.
- Keep operator-assisted deletion and the seven-calendar-day completion commitment
  until a separate self-service deletion decision is accepted.

## Consequences

The operator no longer provisions accounts individually. Public signup increases
email-abuse and account-creation risk, so rate limiting, monitoring, rapid signup
disablement, and accurate privacy language become launch requirements. Historical
milestone records remain unchanged; ADR 0012 continues to document the earlier plan.
