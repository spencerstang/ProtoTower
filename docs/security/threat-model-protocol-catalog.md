# Protocol catalog threat model

Milestone 2 introduces public synthetic wellness content but no accounts, personal
records, or write API.

## Assets and trust boundaries

- immutable published protocol versions;
- unpublished drafts and retired records;
- the anonymous PostgREST credential;
- the web-to-PostgREST response boundary;
- operational logs and staging deployment secrets.

The browser trusts rendered application output. The web adapter does not trust
PostgREST JSON. PostgreSQL does not trust anonymous callers.

## Principal risks and controls

| Risk                                                  | Control                                                                                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous reads disclose drafts or retired content    | RLS is enabled and forced; reviewed select policies use security-definer visibility checks; the public security-invoker view returns active published rows only. |
| Anonymous callers create or change catalog rows       | Anonymous and authenticated roles receive select grants only and no write policies; pgTAP executes a denied anonymous insert.                                    |
| A published version changes or disappears             | A database trigger rejects update and delete operations after `published_at` is set; pgTAP proves both paths.                                                    |
| Malformed or provider-specific JSON enters the domain | The edge adapter treats JSON as `unknown`, requires an exact row shape, and applies strict Zod domain validation.                                                |
| Unsafe reference links reach visitors                 | Domain and database validation require HTTPS references; content remains synthetic and educational.                                                              |
| Provider diagnostics or credentials leak              | The adapter logs only operation and status metadata, never response bodies, headers, URLs, or credentials. Security tests inspect rendered responses.            |
| Supabase outage breaks liveness                       | Catalog requests have a short timeout and typed unavailable state. `/` and `/api/health` do not query Supabase.                                                  |
| Educational content is mistaken for medical advice    | Each record requires a caution, seeds avoid efficacy claims, and detail pages display a clear general-information disclaimer.                                    |

## Residual risk

Public catalog content is intentionally world-readable and may be copied. The
Milestone 2 controls do not evaluate clinical efficacy and must not be represented
as doing so. Authentication and personal-data threats remain deferred because those
surfaces do not exist.
