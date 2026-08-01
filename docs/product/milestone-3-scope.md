# Milestone 3 proposed scope: authenticated personal towers

Status: Approved and implemented; acceptance gate in progress

## Outcome

Milestone 3 gives an invited ProtoTower user private, durable towers organized by
goal or life context. The user signs in through a one-time email magic link, creates
a named tower such as `Sleep better` or `Run a marathon`, adds published protocol
versions from the Milestone 2 catalog, orders those building blocks, removes them,
signs out, and finds the same towers after signing in again.

The milestone proves identity, ownership, and private persistence without adding
adherence tracking or making health claims. Public catalog browsing and application
liveness continue to work when authentication or private-tower dependencies are
unavailable.

## Product boundary

### In scope

- Invite-only email authentication through Supabase Auth magic links
- A generic sign-in request response that does not disclose whether an account
  exists
- A scanner-resistant confirmation step with no authentication side effect on `GET`
- Cookie-based, server-rendered sessions and explicit sign-out
- Create, list, open, rename, and delete up to 12 named personal towers per
  authenticated user
- Add, move up, move down, and remove actions for published protocol versions
- A maximum of 20 distinct protocol identities per tower
- Exact immutable protocol-version pinning
- Optimistic revision checks so concurrent writes cannot silently overwrite each
  other
- Provider-neutral identity, authorization, and tower rules in domain packages
- Forward-only tables, constraints, grants, RLS, and narrowly reviewed create, save,
  and delete RPCs
- Accessible signed-out, check-email, confirmation-error, empty-tower, stale-write,
  unavailable, and signed-in experiences
- Local SMTP authentication tests plus protected staging acceptance with a
  designated test mailbox
- Updated security, architecture, operations, dependency, and release documentation

### Explicitly out of scope

- Public self-service registration
- Tower descriptions, notes, free-text journaling, or public profiles
- Sharing, collaboration, follows, feeds, leaderboards, or social discovery
- Adherence tracking, streaks, measurements, outcomes, or health records
- Personalized medical advice, diagnosis, or treatment
- Protocol authoring, editing, or publishing UI
- Account email changes, password authentication, passkeys, OAuth, MFA, or account
  linking
- Self-service account deletion or data export; the alpha uses a documented
  operator-assisted deletion process
- AI, aggregate analytics, notifications beyond authentication email, payments, or
  MCP
- ProtoTower.ai DNS cutover or a public production launch

## User journey

1. An anonymous visitor may continue to browse the public protocol catalog.
2. An invited visitor opens `/sign-in`, submits an email address, completes any
   configured anti-abuse check, and always receives the same check-email response.
3. Supabase Auth sends a one-time link only when the address belongs to an invited
   account. The application never reports that distinction.
4. Opening the email link stores the short-lived token hash in a secure pre-auth
   cookie and redirects to a clean confirmation URL. It does not consume the token.
5. The visitor deliberately submits the confirmation form. The server verifies the
   token, rotates into an authenticated session, clears the pre-auth cookie, and
   redirects to `/towers`.
6. `/towers` verifies the session and lists only the caller's named goal towers.
7. The user creates a tower, opens `/towers/[towerId]`, and sees an empty state or
   ordered building blocks.
8. The user adds from the public catalog by choosing a destination tower, or
   moves/removes an existing block through same-origin `POST` actions. Each save is
   atomic and revision-checked.
9. Signing out invalidates the session, clears cookies, and returns to a public
   surface.

## Product and privacy rules

- Email addresses live only in Supabase Auth. Do not duplicate them in public
  application tables, rendered markup, analytics, fixtures, screenshots, or logs.
- Local automated users use reserved synthetic addresses and the local SMTP inbox.
  Staging uses a designated test mailbox configured outside the repository.
- A tower title is a private, plain-text goal label. It is Unicode-normalized,
  whitespace-normalized, limited to 80 characters, rejects control characters, and
  is never interpreted as HTML or exposed to another user. Duplicate private titles
  are allowed because stable IDs, not labels, define tower identity.
- Apart from that title, a tower stores only protocol identifiers, immutable version
  numbers, ordering, revision, and operational timestamps.
- A tower does not imply adherence, completion, efficacy, or medical suitability.
- The UI offers only the current public version when adding a protocol, while the
  saved item remains pinned to the exact selected version.
- The same protocol may support several goals and may therefore appear once in each
  of several towers, but never twice in the same tower.
- A later protocol publication never silently changes a saved tower.
- If a pinned protocol is retired, the tower retains an unavailable placeholder
  without disclosing retired content.
- Mutations are deny-by-default, authenticated, same-origin, validated, and
  authorized again by PostgreSQL.
- Authentication and tower failures do not break `/`, `/api/health`, or anonymous
  catalog reads.

## Implementation slices

1. Harden the authenticated surface with a nonce-based production CSP, private
   no-store caching, strict redaction, and validated auth configuration.
2. Add provider-neutral principal, ownership, tower, ordering, and revision rules.
3. Add the forward-only ownership schema, RLS policies, bounded create/save/delete
   RPCs, generated types, synthetic tests, and deletion-cascade proof.
4. Add the server-only Supabase Auth adapter, scanner-resistant magic-link flow,
   session refresh, route protection, and sign-out.
5. Add the private tower adapter and accessible catalog-to-tower experience.
6. Complete unit, pgTAP, browser, accessibility, security, performance, outage, and
   protected staging verification.

## Acceptance criteria

1. An invited synthetic local user can request, confirm, and reuse a magic-link
   session without a password.
2. Sign-in request and confirmation failures do not enumerate accounts or expose
   provider errors.
3. Merely fetching the email link does not consume it; a deliberate same-origin
   `POST` is required.
4. Authenticated responses and every response that sets session cookies are private
   and non-cacheable through the Cloudflare/OpenNext path.
5. Session cookies satisfy the approved server-only attributes, and no access token,
   refresh token, token hash, email address, or cookie reaches logs or rendered
   content.
6. Anonymous callers cannot read or mutate tower rows.
7. A user can create at most 12 private towers. Titles satisfy the normalization and
   length rules, render as plain text, and cannot inject markup or scripts.
8. User A cannot read or mutate User B's towers through tables, joins, RPCs, route
   manipulation, destination selection, or stale identifiers. Cross-owner IDs
   receive the normal not-found experience rather than confirming a private tower
   exists.
9. Direct authenticated table writes are denied. The bounded RPCs derive ownership
   from the verified session and reject malformed, duplicate, oversized,
   unpublished, retired, cross-user, or stale-revision input.
10. Each tower persists at most 20 distinct protocol identities in contiguous order
    and pins exact immutable versions.
11. Browser tests cover sign-in, scanner-safe confirmation, replay/expiry failure,
    create/rename/delete tower, destination selection, add/reorder/remove,
    persistence, sign-out, two-user isolation, accessibility, security headers,
    cookie/cache behavior, outages, and performance.
12. `pnpm verify`, production dependency audit, Supabase reset/lint/pgTAP, and every
    Playwright project pass from a clean checkout.
13. The protected staging workflow applies the migration, uses only externally
    configured secrets and a designated test mailbox, deploys the accepted commit,
    and verifies public and authenticated paths without recording personal data.

## Production launch blockers

Milestone 3 is an invite-only staging alpha. Public self-service registration and a
ProtoTower.ai production launch require a later explicit decision plus:

- owner-reviewed privacy and deletion policies;
- custom SMTP on the product domain with link tracking disabled;
- CAPTCHA or an equivalent abuse control;
- reviewed auth email rate limits and monitoring;
- a user-facing or time-bounded operator account-deletion process; and
- production backup/restore, incident-response, and domain-redirect verification.
