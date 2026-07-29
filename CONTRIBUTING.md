# Contributing

1. Read `AGENTS.md` and the relevant architecture decision records.
2. Create a focused branch and keep changes inside the active milestone.
3. Explain every new dependency in the pull request and add or update an ADR when the dependency changes architecture.
4. Treat all external data as `unknown`, validate it at the boundary, and avoid `any`.
5. Add tests for important behavior and security boundaries.
6. Never use production data in development, test fixtures, screenshots, logs, or prompts.
7. Run `pnpm verify`, database checks, and the relevant Playwright project before requesting review.

Commits should be small, descriptive, and free of generated build output or credentials.
