# Milestone 3 proposed acceptance gate

Status: Proposed for implementation approval

Run from a clean checkout with the repository-supported Node.js and pnpm versions.
Use synthetic local identities and test content only. Do not record the designated
staging mailbox, email contents, token hash, session cookie, access token, refresh
token, publishable key value, or administrative secret.

## Automated local gate

```bash
CI=true pnpm install --frozen-lockfile
CI=true pnpm verify
pnpm audit --audit-level=high --prod
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

The implementation must add automated coverage for:

- principal parsing, deny-by-default ownership, Unicode title validation and
  normalization, per-owner and per-tower bounds, unique membership, contiguous
  ordering, exact version pinning, movement, removal, and revisions;
- strict parsing and redaction of every Auth, cookie, RPC, and PostgREST boundary;
- anonymous denial, owner-only selects, direct-write denial, RPC execution grants,
  fixed ownership derivation, malformed payload denial, cross-user isolation, stale
  revisions, catalog visibility, and account-deletion cascades in pgTAP;
- local SMTP magic-link request and confirmation;
- a scanner-style `GET` that does not consume the link;
- expired, reused, malformed, and disallowed token failures;
- generic account-enumeration-resistant request responses;
- session persistence, verified route protection, sign-out, and cleared cookies;
- create, rename, list, delete, destination selection, add, move, remove,
  persistence, maximum tower/item counts, and two-browser-user isolation;
- stored and reflected XSS attempts through private tower titles;
- nonce CSP, Origin/Host checks, secure cookie attributes, no-store caching,
  Referrer-Policy, no secret or PII in HTML, and no cross-user cache replay;
- Auth-unavailable and database-unavailable isolation from `/`, `/api/health`, and
  the public catalog; and
- authenticated-page accessibility and performance budgets.

## Manual local review

- Inspect the local SMTP inbox without copying message contents into the repository,
  screenshots, logs, or chat.
- Confirm the sign-in intake URL is cleaned before rendering confirmation UI.
- Confirm keyboard-only create, select destination, rename, add, move, remove,
  delete, confirmation, and sign-out flows.
- Confirm narrow and desktop layouts have no horizontal overflow.
- Inspect browser console and network metadata for warnings, email addresses, tokens,
  provider bodies, public caching, or unexpected third-party requests.
- Inspect production build artifacts for service-role or secret keys.

## Protected staging prerequisites

- Exact staging Site URL and confirmation URL allowlist; no broad production
  wildcard.
- Email signup remains disabled and only a designated external test account exists.
- The test mailbox and any SMTP or Auth configuration are managed outside the
  repository and GitHub logs.
- The pinned Auth dependencies and generated Worker pass the server-only,
  `HttpOnly`, private no-store session tests.
- Staging database migration approval remains protected.
- Rollback and operator-assisted account deletion procedures are reviewed.

## Protected staging verification

1. Run the complete frozen verification job.
2. Apply committed forward-only migrations and synthetic non-Auth seeds.
3. Deploy the exact accepted Git SHA.
4. Verify public health and catalog paths before authentication.
5. Use the designated test mailbox to request and deliberately confirm one magic
   link without printing its URL or token.
6. Create two differently named goal towers, add different protocol versions to
   each, reorder and remove membership, then reload and sign in again to prove
   separation and persistence.
7. Use a second designated account to prove it cannot observe, target, rename, or
   mutate either first-account tower.
8. Sign out and prove the private route is inaccessible.
9. Verify authenticated and `Set-Cookie` responses are private no-store through the
   public Cloudflare hostname.
10. Verify protected build metadata reports the accepted Git SHA.
11. Recheck public health and catalog paths after the authenticated flow.

## Rollback review

- Application rollback redeploys a known-good Worker and then verifies public routes,
  sign-in behavior, private-route denial or availability, cookie clearing, and build
  metadata.
- Database migrations remain forward-only. Correct schema, grants, RLS, or RPC
  defects with reviewed compensating migrations.
- Do not roll back the application to a version that interprets the ownership schema
  incompatibly.
- Preserve incident evidence without retaining email addresses, tokens, cookies, or
  tower content.

## Completion record

Record exact commands, pass counts, dependency versions, migration and pgTAP
results, browser projects, accepted commit, workflow URL, staging URL, responsive
visual review, two-user isolation evidence, cache/cookie verification, rollback
review, and any limitations in `docs/releases/milestone-3-validation.md`.

Do not enable public signup, connect ProtoTower.ai, or begin Milestone 4 as part of
this gate.
