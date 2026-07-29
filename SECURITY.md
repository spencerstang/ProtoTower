# Security policy

Do not open a public issue for a suspected vulnerability. Report it privately to the repository owner through the organization security channel once configured.

## Permanent rules

- Never commit credentials, production exports, personal health data, access tokens, session cookies, or private keys.
- Use synthetic development data only.
- Keep administrative diagnostics protected outside local and preview environments.
- Treat logs as potentially durable; record operational facts, not sensitive payloads.
- Run both the local secret scanner and the GitHub secret-scanning workflow.
- Database changes require version-controlled migrations and review.
- Authorization remains deny-by-default until a dedicated milestone implements it.

The Milestone 1 CSP permits inline scripts required by the framework. A nonce-based CSP should be introduced before authenticated or sensitive application surfaces are added.
