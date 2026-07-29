# Environment model

- **local**: Next.js development server plus local Supabase containers.
- **preview**: ephemeral branch or pull-request deployment; no production data.
- **staging**: protected Cloudflare Worker and dedicated Supabase project using synthetic or approved non-production data.
- **production**: separate Cloudflare Worker and Supabase project; not configured by Milestone 1.

Never share credentials across environments. Environment names are validated at runtime. Staging and production require a protected diagnostics token and public application URL.
