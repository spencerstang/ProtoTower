# Architecture overview

ProtoStack is a modular monolith. `apps/web` is the only deployable application. Domain and cross-cutting rules live in `packages/*`; provider adapters will be added later at explicit boundaries. PostgreSQL migrations are portable SQL where practical. Cloudflare Workers is the first hosting target through OpenNext, but framework code avoids Workers-only runtime assumptions.

The public landing page and `/api/health` do not query Supabase. This keeps the core application observable during optional-service outages. Detailed build information is available only in local/preview contexts or with the administrative diagnostics token.
