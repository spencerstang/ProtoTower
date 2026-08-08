# Milestone 5 architecture: invite-only production

Milestone 5 changes the deployment and governance boundary, not the modular-monolith
product architecture. `apps/web` remains the only deployable application and the
existing provider-neutral domain packages, server-only Supabase adapter, RLS, fixed
RPCs, nonce CSP, and private-cache controls remain authoritative.

## Environment separation

Production uses a distinct Cloudflare Worker, Supabase project, GitHub environment,
credentials, diagnostics token, database password, Auth configuration, and backup
set. Staging credentials or synthetic Auth users must never be copied to production.
The reviewed synthetic catalog seed is deterministic product demonstration content;
no user rows are seeded.

## Release sequence

```text
accepted main SHA
  -> protected production migration
  -> public production Worker hostname verification
  -> backup/restore evidence
  -> owner DNS go/no-go
  -> ProtoTower.ai custom-domain cutover
  -> post-cutover verification
  -> synthetic two-account acceptance and cleanup
  -> human accessibility evidence
  -> owner real-user admission go/no-go
```

The production deployment workflow deliberately contains no custom-domain route.
This makes the public and operational surfaces reversible and testable without
changing DNS. Authenticated acceptance waits until a separately approved domain
attachment because magic links and private-route redirects must use the single
canonical origin.

## Availability and privacy

The public landing page, health endpoint, and static privacy/deletion information
remain available when Supabase or email is unavailable. Catalog failure stays scoped.
Authenticated pages fail closed and are never publicly cacheable. Operational logs
contain request/build metadata only and redact credentials and private fields.

## Admission control

`shouldCreateUser: false` remains mandatory. Production accounts are created by an
operator only after an invitation is approved. Supabase Auth rate limits and a
Cloudflare edge rate limit protect the sign-in POST path. Public registration would
require a new milestone, CAPTCHA integration, and threat-model review.
