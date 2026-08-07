# Invite-only production launch threat model

Status: Planned controls for Milestone 5; acceptance evidence pending

Milestone 5 inherits the authenticated-towers and private-practice threat models and
adds production-specific risks.

| Risk                                                 | Required control                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging credentials or data reach production         | Separate provider projects, GitHub environment, tokens, passwords, Auth users, and backups; validate project URLs and never copy user tables.                         |
| A stale or unreviewed commit deploys                 | Main-only workflow, exact SHA input, typed production confirmation, protected environment approval, and build-identity verification.                                  |
| Deployment changes public DNS prematurely            | Production workflow deploys only the Worker; custom-domain attachment is a separate final go/no-go operation.                                                         |
| Unknown users create accounts                        | Keep Supabase signup restricted and `shouldCreateUser: false`; provision each approved account through the operator flow.                                             |
| An attacker floods authentication email              | Keep provider rate limits, add an edge rate limit to the sign-in POST route, monitor non-sensitive failure counts, and retain a rapid disable procedure.              |
| Email tokens are tracked or redirected               | Use custom domain SMTP with click/open tracking disabled, scanner-resistant confirmation, exact Site URL and redirect allowlist, and no wildcard redirect.            |
| Users cannot understand or delete stored data        | Publish accurate privacy/deletion pages, maintain a working domain mailbox, verify ownership privately, complete deletion within seven days, and test cascades.       |
| Backup or support operations leak private data       | Encrypt provider backups, limit operator access, record metadata only, restore only to a disposable protected project, and delete drill resources after verification. |
| Root and `www` serve different or stale applications | Root is canonical, `www` performs a permanent HTTPS redirect, build diagnostics match the accepted SHA, and both paths are tested after cutover.                      |
| A production incident cannot be contained            | Document contacts, disable invitations/email first, roll back the Worker without reversing migrations, use forward-only fixes, and preserve redacted evidence.        |
| Public pages imply clinical efficacy                 | Retain synthetic educational labels and disclaimers; do not add outcomes, personalization, or health claims.                                                          |

Residual risks include possession-based email authentication without MFA, manual
account provisioning/deletion, reliance on Cloudflare/Supabase/Resend, and the hosted
backup lifecycle. These are accepted only for the small invite-only beta and must be
revisited before broader access.
