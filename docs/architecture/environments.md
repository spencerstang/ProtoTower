# Environment model

- **local**: Next.js development server plus local Supabase containers and synthetic
  catalog seeds.
- **preview**: ephemeral branch or pull-request deployment with no production data.
- **staging**: protected Cloudflare Worker and dedicated Supabase project containing
  synthetic data only.
- **production**: separate Cloudflare Worker and Supabase project; not configured by
  Milestone 2.

Never share credentials across environments. Environment names and paired catalog
configuration are validated at runtime. Staging and production require
`PUBLIC_APP_URL`, `ADMIN_DIAGNOSTICS_TOKEN`, `SUPABASE_URL`, and
`SUPABASE_ANON_KEY`; the latter two must be supplied together.

ProtoTower.ai is reserved for the public product but is not connected by Milestone 2. Staging continues to use the documented Workers development hostname until a
separate production and DNS decision is approved.
