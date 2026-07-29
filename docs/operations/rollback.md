# Rollback

## Application

From `apps/web`:

```bash
pnpm exec wrangler deployments list --env staging
pnpm exec wrangler rollback VERSION_ID --env staging --message "Rollback to known-good staging version"
```

A rollback immediately creates a new deployment of the selected Worker version. Afterward:

1. Verify the public landing page and `/api/health`.
2. Verify `/api/admin/build-info` with the protected diagnostics token.
3. Confirm that the reported Git SHA matches the selected known-good version.
4. Record the incident, rollback version, operator, and follow-up fix.

Do not use an application rollback to hide or reverse a database migration.

## Database

Supabase migrations are forward-only. Do not edit an applied migration. Create a reviewed compensating migration. For destructive incidents, stop deployment, preserve evidence, and use the staging project's verified backup/restore process. Milestone 1 does not claim a remote restore test has been performed.
