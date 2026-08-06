# Security policy

Do not open a public issue for a suspected vulnerability. Report it privately to the repository owner through the organization security channel once configured.

## Permanent rules

- Never commit credentials, production exports, personal health data, access tokens, session cookies, or private keys.
- Use synthetic development data only.
- Keep administrative diagnostics protected outside local and preview environments.
- Treat logs as potentially durable; record operational facts, not sensitive payloads.
- Run both the local secret scanner and the GitHub secret-scanning workflow.
- Database changes require version-controlled migrations and review.
- Authorization is deny-by-default; authenticated tower access is owner-only and
  enforced again by PostgreSQL RLS and bounded RPCs.
- Anonymous protocol access is read-only and limited to active published versions.
- Published protocol versions are immutable; corrections require a higher version.
- Private practice dates and protocol associations are behavioral data. Owner-only
  access, redaction, bounded reads, idempotent mutation, and deletion cascades are
  mandatory before tracking may be enabled.

Production responses use a per-response script nonce and authenticated responses
are private and non-cacheable. Session cookies are server-only and `HttpOnly`.
Catalog-specific risks and controls are documented in
`docs/security/threat-model-protocol-catalog.md`. Authentication, ownership,
private-title, session, and cache controls are documented in
`docs/security/threat-model-authenticated-towers.md`. The approved but not yet
implemented practice-history controls are documented in
`docs/security/threat-model-private-practice.md`.
