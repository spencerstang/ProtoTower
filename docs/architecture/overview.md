# Architecture overview

ProtoTower is a modular monolith in the ProtoStack repository. `apps/web` is the
only deployable application. Provider-neutral domain and cross-cutting rules live in
`packages/*`; provider adapters remain at the application edge. PostgreSQL
migrations use portable SQL where practical. Cloudflare Workers is the first hosting
target through OpenNext, while application code stays compatible with standard
Next.js hosting.

Milestone 2 adds the first complete product path:

1. `@protostack/protocol-engine` defines and validates immutable published protocol
   values without importing a provider SDK.
2. PostgreSQL stores stable protocol identities and versioned content. Row-level
   security and grants limit anonymous callers to active, published records.
3. A security-invoker view returns only the latest published version.
4. The web-edge adapter calls PostgREST with standard `fetch`, treats the response
   as `unknown`, and maps it into the domain model.
5. Thin Next.js routes render listing, detail, empty, unavailable, loading, and
   not-found states.

The public landing page and `/api/health` never query Supabase. Catalog failures
produce a scoped unavailable state instead of breaking core application liveness.
Detailed build information remains available only in local/preview contexts or with
the administrative diagnostics token.

Public branding is ProtoTower. Existing repository, Worker, and package identifiers
remain ProtoStack identifiers until an explicit internal migration is justified.
