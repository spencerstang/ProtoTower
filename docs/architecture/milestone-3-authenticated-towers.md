# Milestone 3 proposed architecture: authenticated personal towers

Status: Proposed for implementation approval

## Boundaries

The modular monolith remains one Next.js/OpenNext application. Supabase Auth and
PostgREST are application-edge providers. PostgreSQL remains the authorization
backstop. Provider types and SDKs do not enter domain packages.

The proposed dependency direction is:

```text
thin Next.js routes and server actions
  -> web auth and tower adapters
    -> @protostack/authorization + @protostack/tower-engine
      -> provider-neutral values and policies

web auth and tower adapters
  -> @supabase/ssr + @supabase/supabase-js
    -> Supabase Auth and PostgREST

PostgREST
  -> grants + RLS + bounded public tower RPCs
    -> PostgreSQL tables and immutable protocol versions
```

`@supabase/ssr` and `@supabase/supabase-js` must be exact-version runtime
dependencies of `apps/web` only. `@supabase/ssr` is currently documented as beta,
so implementation must pin it, test OpenNext compatibility, and record the version
and rationale. Deprecated auth-helper packages are prohibited.

## Domain model

`@protostack/authorization` will define:

- a branded authenticated principal ID;
- `anonymous` and `authenticated` principal variants;
- deny-by-default decisions;
- owner-only read and mutation decisions; and
- reason codes safe for logs and tests.

`@protostack/tower-engine` will define:

- a branded tower identifier and reuse of the protocol identity/version contracts
  from `@protostack/protocol-engine`;
- a private Unicode-normalized plain-text goal title;
- a positive immutable protocol version;
- at most 12 towers per owner;
- ordered tower items with positions from 1 through 20;
- no duplicate protocol identity within one tower;
- contiguous ordering;
- a non-negative revision;
- add, remove, move-up, and move-down operations; and
- exact runtime parsing for all serialized tower input and provider output.

Neither package imports Next.js, Supabase, Cloudflare, or a provider SDK.
`@protostack/tower-engine` may depend on `@protostack/protocol-engine`; the reverse
dependency is prohibited.

## Proposed data model

### `public.personal_towers`

| Column       | Rule                                                                |
| ------------ | ------------------------------------------------------------------- |
| `id`         | UUID primary key                                                    |
| `owner_id`   | UUID, indexed, references `auth.users(id)` with `on delete cascade` |
| `title`      | Trimmed private goal label from 1 through 80 characters             |
| `revision`   | Non-negative bigint, incremented by each successful save            |
| `created_at` | Database-generated timestamp                                        |
| `updated_at` | Database-generated timestamp changed only by the save function      |

The create RPC enforces at most 12 towers per owner. Titles may repeat and do not
serve as identifiers. `title` is the only user-supplied text in the model; the table
does not store an email, profile, description, note, or medical field.

### `public.personal_tower_items`

| Column             | Rule                                                      |
| ------------------ | --------------------------------------------------------- |
| `tower_id`         | References `personal_towers(id)` with `on delete cascade` |
| `protocol_id`      | Part of a composite reference to `protocol_versions`      |
| `protocol_version` | Positive integer pinned to an immutable published version |
| `position`         | Integer from 1 through 20                                 |
| `created_at`       | Database-generated timestamp                              |

The primary or unique constraints must enforce one protocol identity per tower and
one position per tower. Position uniqueness must support the atomic replacement
strategy. The save function additionally proves contiguous positions and the
20-item maximum before changing rows. The same protocol identity may appear in
different towers owned by the same or different users.

## Grants, RLS, and mutation surface

- Enable and force RLS on both tables.
- Revoke all privileges from `public` and `anon`.
- Grant `authenticated` only the minimum read privileges required by the UI.
- `personal_towers` select policy:
  `(select auth.uid()) = owner_id`.
- `personal_tower_items` select policy: the referenced tower must be visible to the
  current authenticated user.
- Do not grant authenticated callers direct insert, update, or delete privileges on
  either table.
- Expose three bounded functions:
  - `public.create_personal_tower(title text)`;
  - `public.save_personal_tower(tower_id uuid, title text, payload jsonb,
expected_revision bigint)`; and
  - `public.delete_personal_tower(tower_id uuid, expected_revision bigint)`.
- Revoke every function's default execution privilege and grant execution only to
  `authenticated`.
- Each function is a narrowly reviewed `security definer` routine with a fixed
  search path, no dynamic SQL, exact input validation, and ownership derived
  exclusively from `(select auth.uid())`.
- Create transactionally locks the owner scope, enforces the 12-tower cap, validates
  the normalized title, and returns the new tower ID and revision.
- Save locks the exact caller-owned tower row, checks `expected_revision`, validates
  the private title and every requested protocol version against active published
  catalog data, replaces the item set in one transaction, increments the revision,
  and returns only the caller's new revision.
- Delete locks the exact caller-owned tower row, checks the revision, and cascades
  only that tower's items.
- Direct table denial plus RLS remain defense in depth around the functions.

The implementation must not use `user_metadata` as an authorization source. It must
not expose a service-role or secret key to the browser. Any local administrative key
used by the test harness is process-scoped, redacted, and absent from application
runtime code.

## Authentication flow

### Request

- `/sign-in` accepts one normalized email field as untrusted input.
- The server-side adapter calls `signInWithOtp` with user creation disabled.
- The redirect destination is an exact environment-configured confirmation URL, not
  a user-controlled `next` value or wildcard.
- The response is generic for invited, unknown, throttled, and provider-error
  addresses after basic input validation.
- Email values and provider response bodies are never logged.

### Scanner-resistant confirmation

- The custom auth email template links to an application-owned intake route with a
  short-lived `token_hash` and one allowlisted email token type.
- `GET` validates only the shape, places the token hash in a short-lived `HttpOnly`,
  `Secure` outside local development, `SameSite=Strict` pre-auth cookie, and issues
  a `303` redirect to a clean `/auth/confirm` URL.
- `GET` does not call `verifyOtp` and therefore cannot sign in an email scanner.
- A deliberate same-origin `POST` calls `verifyOtp`, establishes the authenticated
  session, rotates session state, clears the pre-auth cookie, and redirects to
  `/towers`.
- Confirmation responses are `Cache-Control: private, no-store` and
  `Referrer-Policy: no-referrer`.
- Invalid, expired, already-used, tampered, or disallowed token input produces one
  generic recoverable error.

### Session

- Use a new Supabase server client per request.
- Use verified `getClaims()` output for route identity and authorization decisions;
  do not authorize from unverified `getSession()` user data.
- Keep the Supabase SDK and session handling server-only for this milestone.
- Authenticated session cookies must be `HttpOnly`, `Secure` in staging and
  production, and `SameSite=Lax`. If the pinned SSR package cannot support this
  server-only model through OpenNext, implementation stops for an ADR update rather
  than silently making tokens JavaScript-readable.
- Session-refresh responses must preserve the SDK's private no-store cache headers.
  Authenticated pages and APIs are also private and non-cacheable.
- Sign-out is a same-origin `POST`, invalidates the current session, clears all auth
  cookies, and has no `GET` alternative.

Supabase's current guidance for SSR clients, verified claims, passwordless email,
redirect allowlists, and RLS is recorded in:

- <https://supabase.com/docs/guides/auth/choosing-a-server-package>
- <https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs>
- <https://supabase.com/docs/guides/auth/auth-email-passwordless>
- <https://supabase.com/docs/guides/auth/redirect-urls>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>

## Web application surface

- `/sign-in`: public email request form and privacy note
- `/auth/check-email`: generic success state
- `/auth/intake`: token staging only; no authentication side effect
- `/auth/confirm`: deliberate confirmation form and generic failure state
- `/towers`: authenticated list of private goal towers
- `/towers/new`: authenticated creation form
- `/towers/[towerId]`: authenticated tower builder

Catalog cards gain an authenticated add action with an accessible destination-tower
chooser. Tower movement controls must have accessible button alternatives and
cannot depend on drag-and-drop. Titles render only as text. Routes and components
remain thin; mutations call domain operations and adapters.

## Availability and caching

- `/`, `/api/health`, `/protocols`, and protocol detail routes remain independent
  from Auth and personal-tower availability.
- `/sign-in` shows a scoped unavailable state when Auth configuration or transport
  is unavailable.
- `/towers` and `/towers/[towerId]` redirect unauthenticated callers to `/sign-in`
  and show a scoped unavailable state for authenticated dependency failures.
- An authenticated request for another owner's tower uses the normal not-found
  experience and does not reveal that the identifier exists.
- Never cache a response containing `Set-Cookie`, authenticated content, a token
  hash, an email address, or a provider error.
- Production CSP must use a per-response nonce for application scripts and remove
  production `script-src 'unsafe-inline'` before any authenticated page is accepted.

Implementation enables the reviewed `authentication` feature flag and adds a
separate `personalTowers` flag. It must not repurpose `protocolTracking`; adherence
tracking remains disabled.

## Deletion and retention

Deleting an Auth user must cascade to all owned towers and items. Milestone 3 provides an
operator-assisted alpha procedure, records no email in application tables, and
proves the cascade with synthetic database tests. Self-service account deletion and
export require a later approved scope before a public production launch.
