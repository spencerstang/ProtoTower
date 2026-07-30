# ADR: Magic-link authentication and private goal towers

- Status: Proposed
- Date: 2026-07-29

## Context

Milestone 2 intentionally has no accounts or personal state. The next product slice
needs to let a person preserve a private arrangement of published protocol building
blocks without introducing passwords, tracking, health records, social data, or
provider logic into the domain.

Authentication creates new risks: email is personal data, magic links are bearer
credentials, SSR session cookies can leak through caching, and every personal row
needs owner isolation. Public registration also creates email-abuse and privacy
operations that are larger than the first authenticated slice.

## Decision

- Launch Milestone 3 as an invite-only staging alpha.
- Use Supabase Auth email magic links with user creation disabled in the application.
- Use a custom scanner-resistant email template: a link stages a token, and a
  deliberate same-origin `POST` verifies it.
- Keep session and Supabase SDK use server-only. Verify identity with `getClaims()`;
  never authorize from unverified session user data.
- Pin exact versions of `@supabase/ssr` and `@supabase/supabase-js` in `apps/web`
  only. Do not use deprecated auth-helper packages.
- Require nonce-based production script CSP and private no-store handling before
  accepting authenticated routes.
- Let each Auth user create up to 12 private towers named for distinct goals or life
  contexts. Each tower contains one validated plain-text title and at most 20
  distinct immutable protocol versions.
- Put provider-neutral tower and principal rules in domain packages.
- Store ownership in PostgreSQL with an indexed foreign key to `auth.users`, a
  transactionally enforced tower limit, forced RLS, minimal grants, and
  account-deletion cascades.
- Deny direct table writes. Use bounded create, save, and delete RPCs that derive the
  owner from `auth.uid()` and revision-check updates and deletion.
- Keep anonymous catalog access, liveness, and core error handling available when
  Auth or private persistence is unavailable.

## Consequences

Magic links avoid password storage and reset flows, but email account compromise
still compromises the ProtoTower account. Email delivery becomes an authentication
dependency. The application must protect tokens, session cookies, redirects, logs,
and CDN caching.

Invite-only scope preserves the current no-public-signup posture and limits the first
release's abuse surface. It requires an operator to provision and delete alpha
accounts. Public signup, CAPTCHA, custom product-domain SMTP, self-service deletion,
privacy-policy approval, and production-domain launch remain explicit later
decisions.

Goal-specific towers match the product metaphor: a sleep tower and a marathon tower
can contain different building blocks without becoming one undifferentiated stack.
The 12-tower and 20-item bounds keep abuse, performance, and authorization review
tractable. Titles add one private free-text field and therefore require strict
validation, output escaping, redaction, and XSS tests. Descriptions, notes, sharing,
and tracking still require new decisions.

`@supabase/ssr` is documented as beta. The exact dependency and OpenNext behavior
must be verified in the acceptance gate. Failure of the required server-only cookie
model triggers an ADR revision, not a weaker silent fallback.
