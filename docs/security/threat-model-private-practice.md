# Private practice check-ins threat model

Status: Approved for Milestone 4; implementation has not begun

## Assets

- private calendar dates on which a user records practice;
- the association among an owner, tower, protocol identity, and exact version;
- current and removed tower membership inferred from history;
- authenticated sessions, owner identifiers, RLS policies, and RPC grants;
- deletion cascades and bounded retention behavior; and
- logs, caches, browser history, screenshots, tests, traces, and deployment output.

## Trust boundaries

- Every route, form, hidden field, date, identifier, version, cookie, and header from
  the browser is untrusted.
- The Next.js/OpenNext edge verifies input and identity but does not replace database
  authorization.
- Supabase Auth establishes the session; only verified claims become a principal.
- PostgREST carries the authenticated JWT to PostgreSQL and returns untrusted JSON.
- PostgreSQL grants, forced RLS, constraints, foreign keys, and the bounded RPC are
  the final ownership and integrity boundary.
- Cloudflare and browser caches must never mix private history between users.

## Principal risks and controls

| Risk                                                                          | Required control                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous caller reads or mutates practice history                            | Grant anonymous roles no privileges; force RLS; prove denial through table, RPC, and browser tests.                                                                                   |
| User A infers User B's activity, dates, membership, or row count              | Derive ownership from `auth.uid()`, use owner-only policies, return generic not-found/denied results, and test identifiers, filters, counts, timing, and cache replay with two users. |
| Caller forges owner, tower, protocol, version, or date                        | Accept no owner ID; validate exact branded values; lock the caller-owned tower; verify current exact membership for record; enforce composite foreign keys and bounds.                |
| Direct write bypasses reviewed mutation semantics                             | Revoke insert, update, and delete; grant only the fixed-search-path authenticated RPC; use no dynamic SQL.                                                                            |
| Replay creates duplicates or undo produces inconsistent state                 | Enforce the unique key and make both record and undo idempotent under concurrent requests.                                                                                            |
| Removed membership permits new false history                                  | Require current exact membership for record and test removal races; allow only deletion of an existing owner-owned historical row after removal.                                      |
| Removing a block silently erases history                                      | Reference the owned tower and immutable protocol version rather than the mutable membership row; test retention after removal.                                                        |
| Tower or account deletion leaves orphaned behavioral data                     | Use database cascades and pgTAP proofs for tower, multi-tower, and Auth-user deletion.                                                                                                |
| Malformed, future, or unbounded backdated activity expands or corrupts data   | Use one strict date grammar, a finite correction window, a reviewed local/UTC boundary allowance, database clock validation, bounded queries, and hard row limits.                    |
| Check-in is presented as adherence, efficacy, or medical evidence             | Use neutral `recorded practice` language; store no score or outcome; prohibit effectiveness summaries, streak pressure, and medical claims.                                           |
| Private activity leaks through logs, analytics, email, screenshots, or errors | Log only operational categories; use synthetic fixtures; prohibit activity payloads in analytics/notifications/AI; scan HTML, logs, traces, artifacts, and evidence.                  |
| CDN or browser cache serves one user's history to another                     | Mark authenticated and mutation responses private no-store, preserve session-refresh headers, and test public Cloudflare responses and cross-user replay.                             |
| CSRF records or removes activity                                              | Mutate only through same-origin `POST`, validate Origin/Host, retain SameSite server-only cookies, and provide no state-changing `GET`.                                               |
| XSS or third-party script observes private history                            | Retain nonce CSP, avoid unsafe HTML and third-party scripts, render catalog labels as text, and keep auth tokens `HttpOnly`.                                                          |
| Provider error or malformed JSON reaches the UI or logs                       | Parse all provider responses from `unknown`, map failures to typed generic states, and never propagate response bodies.                                                               |
| Practice-store outage breaks public product or tower editing                  | Isolate the practice adapter and show a scoped unavailable region; keep landing, health, sign-in, catalog, and non-practice tower operations working.                                 |
| Feature is partially enabled before review                                    | Keep `protocolTracking` false until migrations, tests, docs, staging evidence, and rollback review pass together.                                                                     |

## Security invariants

- A verified session is necessary but never sufficient for access to a row.
- The caller never supplies an owner identity.
- A tower ID, protocol ID, version, or date alone never proves access.
- A `GET` request never records or removes practice history.
- New history requires current exact tower membership; undo requires an existing
  caller-owned historical key.
- No direct table mutation is granted to authenticated or anonymous roles.
- No private history response is publicly cacheable.
- No practice date, membership, identifier, count, or payload is logged or sent to a
  third party.
- A check-in is not an outcome, score, medical record, or effectiveness claim.
- Public catalog and liveness remain independent from private practice storage.

## Residual risks

A compromised email account or signed-in browser can act as the user. Calendar dates
and protocol associations can reveal sensitive routines even without notes or health
measurements. The invite-only synthetic alpha limits exposure but does not make the
data non-sensitive. Operator-assisted deletion and the absence of self-service export
block real-user production collection. Supabase, Cloudflare, and the pinned SSR
package remain external dependencies governed by the existing authenticated-tower
threat model.
