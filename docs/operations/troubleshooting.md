# Troubleshooting

- **pnpm version mismatch**: run Corepack with the version in `package.json`.
- **Supabase will not start**: confirm Docker is running, then use `supabase stop --no-backup` and `pnpm db:start`.
- **Port collision**: inspect ports 3000 and 54320–54324 or adjust `supabase/config.toml` locally without committing environment-specific changes.
- **Environment validation error**: compare `.env.local` with `.env.example`; staging and production require `PUBLIC_APP_URL` and `ADMIN_DIAGNOSTICS_TOKEN`.
- **OpenNext preview failure**: run `pnpm --filter @protostack/web build` first, then `pnpm --filter @protostack/web preview`.
- **Browser tests fail locally**: run `pnpm playwright:install` and confirm port 3000 is available.
