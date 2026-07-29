# Health checks and diagnostics

## Liveness

`GET /api/health` is a shallow application liveness endpoint. It returns HTTP `200` when the Next.js process or Worker can execute a request. It intentionally does not contact Supabase or any optional provider, so a provider outage cannot make the core application appear dead.

The response contains only:

- `status`
- an ISO-8601 check time
- a generated or forwarded request identifier

It must not expose versions, environment variables, credentials, database state, or user information.

## Build diagnostics

`GET /api/admin/build-info` exposes build metadata only:

- without a token in local or preview environments;
- with `Authorization: Bearer <ADMIN_DIAGNOSTICS_TOKEN>` in staging or production.

Unauthorized staging and production requests receive `404` rather than advertising that the administrative route exists. Responses are marked `no-store`.

## Post-deployment verification

After a staging deployment, verify:

```bash
curl --fail --show-error https://STAGING_HOST/api/health
curl --fail --show-error \
  -H "Authorization: Bearer $ADMIN_DIAGNOSTICS_TOKEN" \
  https://STAGING_HOST/api/admin/build-info
```

Do not paste the real diagnostics token into a ticket, terminal recording, chat, or repository.
