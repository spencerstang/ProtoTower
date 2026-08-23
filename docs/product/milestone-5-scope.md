# Milestone 5: production beta

Status: Updated by ADR 0014 for a quiet-launch open beta. Production deployment and
DNS cutover remain gated.

## Outcome

Milestone 5 creates a production environment for the existing ProtoTower experience
at `https://prototower.ai`. Visitors may create passwordless accounts. The product continues to
offer the public synthetic educational catalog plus private towers and bounded
practice check-ins; it does not broaden the data model or make efficacy claims.

## Included

- A separate protected `production` GitHub environment, Cloudflare Worker, and
  Supabase project with no credentials shared with staging.
- Exact-commit, main-only production deployment with explicit typed confirmation and
  protected database and web approvals.
- A pre-DNS Worker verification phase followed by a separately approved canonical
  domain cutover.
- Custom SMTP on the ProtoTower domain with link/open tracking disabled.
- Passwordless public account creation with required email confirmation and a clear
  notice that ProtoTower is in beta and some features are not functional yet.
- Public privacy and account-deletion information, with verified operator-assisted
  deletion completed within seven calendar days.
- Reviewed provider rate limits plus a Cloudflare edge rate limit for the sign-in
  endpoint before public signup is enabled.
- Production backup/restore evidence, incident response, rollback, domain redirect,
  security header, accessibility, and two-account isolation gates.

## Explicitly excluded

- Password authentication, social login, or MFA
- Outcomes, notes, scores, streaks, recommendations, or health claims
- Analytics, advertising, reminders, AI, payments, MCP, or third-party integrations
  beyond hosting, database/authentication, and authentication email
- Protocol authoring or publishing UI
- Automated account export or self-service deletion
- Any DNS cutover before the final owner go/no-go

## Data boundary

Production may store an account email address in Supabase Auth, an opaque owner ID,
private tower titles and memberships, and deliberately recorded practice dates. It
must not store profiles, notes, symptoms, diagnoses, outcomes, free-form practice
content, or analytics identifiers. Repository, fixtures, screenshots, and validation
continue to use synthetic data only.

## Completion gate

Milestone 5 is complete only after:

1. The owner approves the public privacy/deletion text and a working
   `@prototower.ai` support mailbox.
2. The separate production Supabase project, Cloudflare credentials, GitHub
   environment, custom SMTP, exact redirect allowlist, signup controls, abuse
   controls, and backup policy are configured and observed.
3. All repository, dependency, secret, migration, unit, build, pgTAP, browser,
   accessibility, security, and performance gates pass from a clean checkout.
4. The exact accepted commit deploys first to the production Worker hostname and
   passes public, protected diagnostics, privacy, deletion, and sign-in-page
   verification. Authenticated acceptance is intentionally deferred because magic
   links use the canonical origin.
5. Backup evidence and a restore drill to a disposable project are recorded without
   copying data or credentials.
6. The owner gives an explicit DNS go/no-go. The root domain serves the accepted
   build, `www` redirects to the root, HTTPS is enforced, and rollback is rehearsed.
7. On the canonical domain, a synthetic two-account production acceptance proves
   open account creation, beta-email delivery, scanner-safe confirmation, owner isolation, private cache controls,
   record/undo, cascade, and cleanup without retaining private values.
8. A human screen-reader spot-check passes on the canonical domain.
9. A synthetic new address proves operator-free account creation and receives the beta
   limitations notice before quiet-launch signup is enabled.
