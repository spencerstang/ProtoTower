# Milestone 4 architecture: private practice check-ins

Status: Approved; implementation has not begun

## Boundaries

ProtoTower remains one Next.js/OpenNext modular monolith. Practice rules live in a
provider-neutral domain package, the PostgREST adapter remains at the web edge, and
PostgreSQL remains the final ownership and integrity boundary.

```text
thin tower route and server actions
  -> web practice-history adapter
    -> @protostack/tracking-engine
      -> @protostack/tower-engine + @protostack/protocol-engine values

web practice-history adapter
  -> existing server-only Supabase client / PostgREST
    -> grants + forced RLS + bounded practice RPC
      -> personal towers + immutable protocol versions + practice check-ins
```

No new runtime dependency or provider SDK is approved. `@protostack/tracking-engine`
may depend on `@protostack/tower-engine` and `@protostack/protocol-engine`; neither
package may depend on tracking. Domain packages must not import Next.js, Supabase,
Cloudflare, or browser APIs.

## Domain model

`@protostack/tracking-engine` will replace its generic disabled placeholder with:

- a strict `YYYY-MM-DD` practice-date value;
- one immutable check-in value containing tower ID, protocol ID, positive immutable
  version, practice date, and creation timestamp;
- one reviewed recent-history range and one reviewed correction-window constant;
- record and undo commands that contain no owner ID;
- exact parsers for serialized provider input and output;
- typed query results and mutation rejections safe for UI and logs; and
- a provider-neutral repository interface for bounded history, record, and undo.

The package will not define outcomes, scores, streaks, reminders, free-form events,
or an open-ended `payload: unknown`. It represents only the approved check-in shape.

## Proposed data model

### `public.protocol_practice_checkins`

| Column             | Rule                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| `id`               | UUID primary key                                                          |
| `owner_id`         | UUID referencing `auth.users(id)` with `on delete cascade`                |
| `tower_id`         | UUID; composite owner/tower reference with `on delete cascade`            |
| `protocol_id`      | UUID referencing the stable protocol identity                             |
| `protocol_version` | Positive integer referencing the immutable published version              |
| `practice_date`    | Calendar date accepted by the reviewed bounded-date policy                |
| `created_at`       | Server-generated timestamp used for operations, not adherence measurement |

Required constraints and indexes:

- a composite foreign key proves `tower_id` belongs to `owner_id`;
- a composite foreign key pins the immutable protocol identity and version;
- one unique row exists per owner, tower, protocol, version, and practice date;
- owner/tower/date and owner/date indexes support bounded private history queries;
- grants expose no anonymous access and no direct authenticated insert, update, or
  delete; and
- table and row comments state that a check-in is a private user-entered record, not
  evidence of adherence or outcome.

Practice history remains when a current tower item is removed because it references
the tower and immutable protocol version, not the mutable membership row. Tower and
Auth-user deletion cascade. Published protocol versions remain immutable and are not
deleted as part of a practice operation.

## Authorization and mutation

Forced RLS applies even to table owners. Authenticated select policy requires
`owner_id = auth.uid()`. Anonymous and public roles receive no practice privileges.

Direct writes are revoked. A reviewed security-definer RPC such as
`public.set_protocol_practice_checkin(...)` will:

1. accept tower ID, protocol ID, version, practice date, and the requested recorded
   boolean, but never owner ID;
2. require an authenticated `auth.uid()` and a fixed safe search path;
3. validate the bounded date policy before checking protected membership;
4. lock and verify the exact caller-owned tower;
5. for record, verify current membership at the exact pinned immutable version and
   insert idempotently;
6. for undo, delete only the caller-owned exact historical row even when current
   membership no longer exists; and
7. return a minimal typed result without tower title, protocol content, owner ID, or
   provider error detail.

The function uses no dynamic SQL. Execution is revoked from default roles and granted
only to `authenticated`. Database tests must call both the table and RPC boundaries
as anonymous, owner, and non-owner roles.

## Date and query bounds

The implementation must choose and document one finite correction window before the
first migration is accepted. The UI sends an explicit calendar date; it does not
silently infer or store a user profile or time zone. The application validates the
date first, PostgreSQL validates it again against its clock with only a reviewed
one-day allowance for local/UTC boundary skew, and neither layer accepts unbounded
historical or future insertion.

Recent-history reads require a bounded start/end range no larger than the domain
constant. The adapter orders by practice date and stable identity, applies a hard row
limit derived from 20 tower items times the history range, and rejects truncated or
malformed provider responses rather than returning partial state as complete.

## Web application surface

The existing `/towers/[towerId]` route gains:

- an accessible date control with a clear allowed range;
- one `Practiced` action for each current protocol block;
- an idempotent undo action for each visible historical check-in;
- a recent-history region that distinguishes current and removed blocks without
  exposing retired catalog content; and
- scoped unavailable, invalid-date, membership-changed, and generic denied states.

Mutations are same-origin `POST` server actions. Controls must work by keyboard and
screen reader, cannot depend on color or drag-and-drop, and must not use optimistic
client state as the source of truth. Routes and components remain thin; domain rules
and provider parsing remain outside React.

## Availability, caching, and observability

- `/`, `/api/health`, `/sign-in`, `/protocols`, and protocol detail routes do not
  query practice history.
- A practice-history failure does not hide or corrupt the tower itself; the tower
  displays a scoped practice-unavailable region.
- Authenticated tower/history responses and every mutation response are private
  no-store through Next.js, OpenNext, and Cloudflare.
- Operational logs may contain only request ID, route class, result category, and
  latency. They contain no owner, tower, protocol, date, title, membership, or row
  payload.
- No practice event is sent to analytics, notifications, AI, email, or third-party
  observability.

## Feature flag and rollback

`protocolTracking` remains `false` during planning and implementation. Enabling it
requires the full accepted gate. `outcomes`, `aggregateAnalytics`, `notifications`,
`aiInteroperability`, and `readOnlyMcp` remain false.

Application rollback disables the UI flag only after confirming the deployed code
still understands the forward-only schema. Database rollback uses a compensating
migration; accepted migrations are never reversed destructively. Historical rows
remain private and deletable through tower/account cascades while the UI is disabled.
