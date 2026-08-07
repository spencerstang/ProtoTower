# Authenticated personal towers threat model

Status: Implemented and acceptance-gated in Milestone 3

## Assets

- invited account email addresses held by Supabase Auth;
- magic-link token hashes and short-lived pre-auth cookies;
- access tokens, refresh tokens, and authenticated session cookies;
- private tower membership, order, and revision;
- ownership identifiers and RLS policies;
- Supabase publishable configuration and protected operational secrets;
- logs, caches, browser history, screenshots, test artifacts, and deployment output.

## Trust boundaries

- The public browser and all form, query, cookie, and header values are untrusted.
- Email delivery systems and link scanners may fetch links automatically.
- The Next.js/OpenNext edge verifies input and identity but does not replace database
  authorization.
- Supabase Auth is trusted to issue and verify sessions; its responses remain
  untrusted until parsed.
- PostgREST carries the verified user JWT to PostgreSQL.
- PostgreSQL grants, RLS, constraints, and bounded tower RPCs are the final ownership
  boundary.
- Cloudflare caching must never mix authenticated responses between users.

## Principal risks and controls

| Risk                                                           | Required control                                                                                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account enumeration                                            | Return one generic check-email response for invited, unknown, throttled, and provider-error addresses; log no email or provider body.                                               |
| Email bombing or automated requests                            | Keep signup invite-only, retain provider rate limits, monitor generic failures, and require CAPTCHA plus custom SMTP before public registration.                                    |
| Email scanner consumes a one-time link                         | `GET` stages the token in a short-lived secure cookie and redirects to a clean URL; only deliberate same-origin `POST` verifies it.                                                 |
| Token leaks through URL, referrer, cache, or logs              | Immediately clean the URL; use `no-referrer` and private no-store responses; redact queries, cookies, auth headers, tokens, and provider bodies.                                    |
| Open redirect or token sent to another origin                  | Use exact environment redirect allowlists and fixed post-auth destinations; reject user-controlled `next` and wildcard production redirects.                                        |
| Session fixation, replay, expiry, or stale identity            | Rotate into a new verified session, clear pre-auth state, reject reused/expired links generically, refresh through the SSR adapter, and verify identity with `getClaims()`.         |
| XSS steals a JavaScript-readable session                       | Keep auth SDK use server-only, require `HttpOnly` session cookies, prohibit unsafe HTML, and replace production inline-script allowance with a nonce-based CSP.                     |
| CSRF changes a tower or signs a user out                       | Mutate only on `POST`, require same-origin Origin/Host validation, use SameSite cookies, and provide no state-changing `GET` route.                                                 |
| CDN serves User A's page or refreshed token to User B          | Mark authenticated and `Set-Cookie` responses private no-store, preserve SSR refresh cache headers, and test through the OpenNext/Cloudflare staging path.                          |
| Anonymous user reads private tower data                        | Revoke anonymous privileges, enable and force RLS, target policies to `authenticated`, and prove denial with pgTAP and browser tests.                                               |
| User A reads or mutates User B's tower                         | Derive ownership only from verified identity and `auth.uid()`, index ownership, use owner-select RLS, and test two-user isolation across every read/write path.                     |
| A guessed UUID confirms that another private tower exists      | Return the same not-found experience for absent and non-owned tower IDs; never include another owner's title or metadata in errors.                                                 |
| Caller forges `owner_id` or bypasses RLS through a write       | Grant no direct table writes; expose only fixed-search-path RPCs that accept no owner ID and derive it from `auth.uid()`.                                                           |
| User creates excessive towers                                  | Creation RPC transactionally locks the owner scope and enforces at most 12 towers. Stable UUIDs, not potentially duplicate titles, identify targets.                                |
| Private title injects markup or leaks                          | Treat title as untrusted plain text, validate and escape it, prohibit HTML interpretation, redact it from operational logs, and test stored/reflected XSS payloads.                 |
| Security-definer RPCs are abused                               | Revoke default execution, grant authenticated only, use no dynamic SQL, validate exact bounded input, lock the target owner/tower rows, and test malformed/cross-user payloads.     |
| Concurrent tabs silently overwrite order                       | Require an expected revision and reject stale writes; surface an accessible reload-and-retry state.                                                                                 |
| Tower references draft, retired, malformed, or mutable content | Accept only existing active published versions; pin the immutable composite key; display a content-free placeholder if a saved protocol is later retired.                           |
| Personal data leaks into application storage or observability  | Keep email only in `auth.users`; store only the required private title and no profile or notes; use synthetic local identities; scan logs, HTML, screenshots, traces, and fixtures. |
| Service or secret key reaches the browser                      | Use only the publishable key for user-scoped runtime calls; keep administrative keys outside application code and verify built assets and responses.                                |
| Auth or database outage breaks the public product              | Keep landing, health, catalog, and core errors independent; use scoped sign-in/tower unavailable states and timeouts.                                                               |
| Account deletion leaves private rows behind                    | Foreign keys cascade from `auth.users`; synthetic pgTAP proves tower and item deletion; alpha operations record deletion without copying identifiers.                               |

## Security invariants

- Unauthenticated means no tower access.
- Authenticated does not mean access to another owner's data.
- The application never accepts an owner identifier from a caller.
- A tower identifier is never sufficient for access; every operation rechecks its
  owner.
- A `GET` request never signs in, signs out, or mutates a tower.
- No authenticated or token-bearing response is publicly cacheable.
- No email, token, cookie, authorization header, or provider body is logged.
- `user_metadata` is not an authorization source.
- Service-role and secret keys never enter browser code.
- Public catalog content remains educational and separate from private ownership.

## Residual risks

Possession of the invited email account is sufficient to obtain a ProtoTower session;
MFA is not included. A compromised browser can act as the signed-in user. Supabase
Auth and email delivery remain external dependencies. Time-bounded operator-assisted
account deletion is accepted for the small invite-only production beta but blocks
broader or self-service access.
The selected SSR package is beta and may require a reviewed upgrade or revised ADR.
