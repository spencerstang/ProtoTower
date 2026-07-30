# Troubleshooting

- **pnpm version mismatch**: run Corepack with the version in `package.json`.
- **Supabase will not start**: confirm Docker is running, then use `supabase stop --no-backup` and `pnpm db:start`.
- **Port collision**: inspect ports 3000 and 54320–54324 or adjust `supabase/config.toml` locally without committing environment-specific changes.
- **Environment validation error**: compare `.env.local` with `.env.example`; staging and production require `PUBLIC_APP_URL` and `ADMIN_DIAGNOSTICS_TOKEN`.
- **Catalog is resting**: confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are both
  present, run `pnpm db:status`, and verify `/rest/v1/published_protocol_catalog`
  returns only synthetic published records with the anonymous key.
- **Catalog is empty after staging migration**: rerun the protected workflow with
  `deploy_database` enabled; it uses `supabase db push --include-all --include-seed`.
- **Draft or retired record is visible**: stop deployment, preserve the response,
  run `pnpm db:test`, and review RLS policies before any corrective forward
  migration.
- **OpenNext preview failure**: run `pnpm --filter @protostack/web build` first, then `pnpm --filter @protostack/web preview`.
- **Browser tests fail locally**: run `pnpm playwright:install` and confirm ports
  3000 and 54329 are available.
