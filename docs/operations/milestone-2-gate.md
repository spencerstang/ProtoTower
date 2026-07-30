# Milestone 2 acceptance gate

Run from a clean checkout with the repository-supported Node.js and pnpm versions.
Use synthetic data only.

```bash
CI=true pnpm install --frozen-lockfile
CI=true pnpm verify
pnpm audit --audit-level=high --prod
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

Confirm manually:

- `/` and `/api/health` remain available when catalog configuration is absent;
- `/protocols` lists only active protocols with a published version;
- each catalog link opens the expected immutable latest version;
- unknown and unpublished slugs return the normal not-found experience;
- no route, response, log, fixture, screenshot, or seed contains personal data;
- the protected staging deployment reports the accepted Git SHA.

Record exact commands, results, commit, workflow URL, staging URL, visual review, and
rollback review in `docs/releases/milestone-2-validation.md`.
