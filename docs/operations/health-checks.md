# Health checks and diagnostics

## Liveness

`GET /api/health` is a shallow application liveness endpoint. It returns HTTP `200` when the Next.js process or Worker can execute a request. It intentionally does not contact Supabase or any optional provider, so a provider outage cannot make the core application appear dead.

The response contains only:

- `status`
- an ISO-8601 check time
- a generated or forwarded request identifier

It must not expose versions, environment variables, credentials, database state, or user information.

## Catalog availability

`GET /protocols` is an optional-dependency readiness surface, not a liveness
endpoint. When PostgREST is missing, slow, rejects the request, or returns malformed
JSON, the route renders an explicit unavailable state. Do not change
`/api/health` to fail because the catalog is unavailable.

## Build diagnostics

`GET /api/admin/build-info` exposes build metadata only:

- without a token in local or preview environments;
- with `Authorization: Bearer <ADMIN_DIAGNOSTICS_TOKEN>` in staging or production.

Unauthorized staging and production requests receive `404` rather than advertising that the administrative route exists. Responses are marked `no-store`.

## Post-deployment verification

After a staging or pre-DNS production deployment, verify:

```bash
curl --fail --show-error https://STAGING_HOST/api/health
curl --fail --show-error \
  -H "Authorization: Bearer $ADMIN_DIAGNOSTICS_TOKEN" \
  https://STAGING_HOST/api/admin/build-info
curl --fail --show-error https://STAGING_HOST/protocols
curl --fail --show-error \
  https://STAGING_HOST/protocols/morning-light-routine
```

Confirm the catalog includes the latest published synthetic version and does not
include drafts or retired records. Do not paste the real diagnostics token into a
ticket, terminal recording, chat, or repository.

Production additionally verifies `/privacy`, `/account-deletion`, `/sign-in`, the
exact accepted Git SHA, CSP, private/no-store behavior, the canonical root origin, and
the permanent `www` redirect after DNS cutover.
