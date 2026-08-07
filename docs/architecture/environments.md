# Environment model

- **local**: Next.js development server plus local Supabase containers and synthetic
  catalog seeds.
- **preview**: ephemeral branch or pull-request deployment with no production data.
- **staging**: protected Cloudflare Worker and dedicated Supabase project containing
  synthetic data only.
- **production**: separate protected Cloudflare Worker and Supabase project approved
  for Milestone 5 implementation, but not for DNS cutover or real-user admission until
  its acceptance gate and final owner go/no-go pass.

Never share credentials across environments. Environment names and paired catalog
configuration are validated at runtime. Staging and production require
`PUBLIC_APP_URL`, `ADMIN_DIAGNOSTICS_TOKEN`, `SUPABASE_URL`, and
`SUPABASE_ANON_KEY`; the latter two must be supplied together.

ProtoTower.ai is the canonical production origin but remains disconnected during the
pre-DNS production Worker phase. Staging stays synthetic and continues to use its
documented Workers hostname. Production may receive real-user data only after the
Milestone 5 policy, provider, backup/restore, accessibility, DNS, and admission gates.
