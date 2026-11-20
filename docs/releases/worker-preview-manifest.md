# Cloudflare Worker startup compatibility

Staging deployment exposed a runtime failure that the Node-based browser tests did
not catch: Next.js 16.4 loads `.next/server/preview-props.json` during server
construction, but the pinned OpenNext 1.19.11 adapter omitted it from its inlined
manifest loader. Every Worker request failed with Cloudflare error 1101.

The Worker build now backports the one-line manifest glob change from
https://github.com/opennextjs/opennextjs-cloudflare/pull/1356. It embeds the real
manifest; it does not substitute empty draft-mode keys. The patch is idempotent and
fails if the adapter version or expected loader pattern changes. Remove it when
upgrading to an adapter release containing the upstream fix.

CI now builds the OpenNext artifact and starts it under local Wrangler, requiring
the health route to return HTTP 200 and `status: ok`. This catches Worker startup
failures before deployment. Public/authenticated staging acceptance and production
rollout remain separate gates.
