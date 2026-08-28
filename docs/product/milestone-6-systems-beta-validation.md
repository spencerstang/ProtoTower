# Milestone 6: systems beta validation

Status: Accepted by the owner on 2026-08-28; implementation remains subject to the
existing protected deployment and production gates

Target duration: 8–12 weeks after kickoff

## Outcome

Milestone 6 tests whether ProtoTower can become a retained, paid personal-systems
product rather than only a protocol catalog or habit tracker. A person creates a
pseudonymous account, defines what they want to accomplish and how they will evaluate
progress, adopts or creates a base protocol, stacks additional protocols into an
effective system, practices it, and completes a review that retains or revises the
system.

Health & Fitness supplies the initial educational catalog, but the shared model and
language remain suitable for Relationships, Financial Well-Being, and Mental
Optimization. Goals are optional. Systems, protocols, evidence, and review cycles are
the primary concepts.

The milestone also proves a narrow, provider-neutral agent contract: an authorized
agent may read a user's system and submit a structured proposal, but a person must
approve the proposal before it changes private state.

## Product hypothesis

People who already use AI for personal improvement will repeatedly use and pay for a
private system that turns advice into structured, versioned protocols that they and
their authorized agents can operate together.

The milestone succeeds only if observed behavior supports activation, retention,
review, agent use, and willingness to pay. Shipping the features alone is not success.

## Primary product loop

1. Create or enter an account and choose a pseudonym.
2. Answer:
   1. **What are you trying to accomplish?**
   2. **How will you know if the system is helping?**
   3. **What is the timeframe?**
   4. **How will you track it?**
3. Choose a catalog protocol or create an original protocol as the system's base.
4. Add catalog, modified, or original protocols to the tower's stack.
5. Practice the system and record deliberately selected observations.
6. Review evidence against the success definition.
7. Retain, revise, pause, or replace parts of the system.

## Included

### Authenticated account experience

- Replace **Sign in** with a pseudonymous account control whenever a verified session
  exists.
- Provide sign out and the existing account-deletion path from the account surface.
- Never use the email address as the visible product identity.

### Pseudonymous identity

- Offer a memorable generated pseudonym during onboarding.
- Let the user accept it, request another, or enter a custom pseudonym.
- Let the user edit the pseudonym later without changing Auth identity or ownership.
- Apply reviewed normalization, length, reserved-name, moderation, and privacy rules.
- Pseudonyms are private account presentation in this milestone; they are not public
  profiles, handles, search keys, or social identities.

### Systems and towers

- Make **system** the primary product concept and retain **tower** as its stacked
  visual representation.
- Allow an optional specific goal, target date, duration, or review cadence without
  requiring a goal.
- Store an understandable success definition and user-selected tracking method.
- Support no fixed timeframe and no tracking when deliberately selected.
- Avoid scores, streak pressure, medical claims, or a universal success metric.

### Catalog-to-system flow

- Provide **Use in my tower** on every catalog card and protocol detail view for an
  authenticated user.
- The first selected protocol becomes the base of a new system.
- Later selections may be added to an existing system or used to start another.
- Preserve the selected protocol across sign-in, system selection, and creation.
- Preserve the immutable catalog protocol identity and exact published version.

### Original protocols and private modifications

- Let a user create an original private protocol without selecting catalog content.
- Let a user make a private modification of a catalog protocol without changing the
  catalog record.
- Let a user define, add, remove, reorder, and revise protocol elements.
- Distinguish catalog, privately modified, and original protocols in the UI and data.
- Preserve revision history, source provenance, and safe concurrent-update behavior.
- Do not add public user publishing, discovery, ratings, or sharing.

### Review cycle

- Provide one concise system review that presents the user's success definition,
  timeframe, selected observations, and current protocol revisions.
- Let the user retain, revise, pause, or replace system components.
- Preserve prior revisions and review decisions without fabricating efficacy.

### Narrow agent contract

- Define versioned provider-neutral resources, commands, proposal events, approval
  events, cursors, actor types, provenance, and structured errors.
- Allow a scoped agent grant to read one selected system.
- Allow the agent to submit a proposal to add or revise a protocol element.
- Require explicit human approval before applying every agent proposal.
- Support idempotency keys and optimistic concurrency.
- Provide a replayable cursor-based feed for the grant's permitted resources.
- Let the user inspect and revoke the grant immediately.
- Keep managed autonomous execution, background agents, third-party webhooks, public
  MCP exposure, and unrestricted account grants disabled.

### Commercial validation

- Present a founding paid plan to eligible design partners before the product is
  considered feature-complete.
- Test an annual price between $49 and $72, with the intended core price anchored at
  $72 per year or approximately $8 per month.
- Use a privacy-respecting subscription model without advertising or data sale.
- Record payment state separately from private system content.
- Provide a truthful cancellation and refund surface before charging.

### Privacy-respecting measurement

- Record only reviewed product events needed to evaluate the milestone.
- Do not record pseudonym text, email, objective text, success-definition text,
  protocol content, observation content, private identifiers, or agent payloads in
  analytics.
- Use first-party opaque identifiers, documented retention, deletion propagation,
  access control, and an analytics disable procedure.
- Required event classes are account activation, pseudonym completion, first system,
  base protocol, added protocol, configured success definition, completed review,
  system revision, agent grant, agent proposal, approval decision, and paid conversion.

## Explicitly excluded

- Additional public life-domain catalogs beyond the accepted Health & Fitness content
- Diagnosis, treatment, therapy, financial advice, personalized medical claims, or
  claims that a protocol caused an outcome
- Advertising, sale of data, affiliate recommendations, donations, marketplace
  commissions, creator payouts, public profiles, social discovery, or collaboration
- Public user-authored protocol publishing, ratings, comments, or moderation at scale
- Native mobile applications, wearable integrations, bank integrations, calendar
  integrations, reminders, push notifications, or background location
- Streaks, universal scores, leaderboards, gamified currencies, or engagement pressure
- Autonomous agent writes, broad account access, agent-to-agent sharing, third-party
  webhook delivery, public SDK support, or general MCP availability
- Managed AI coaching or uncapped model usage
- Organizational accounts, families, coaches, teams, or enterprise administration
- Any feature that is not necessary to test the primary product hypothesis

## Data and trust boundary

Milestone 6 may add a private pseudonym; domain-neutral system intent; optional goal,
timeframe, success definition, and tracking configuration; private original and
modified protocol revisions; review decisions; agent grants and proposals; audit
records; minimal product events; and subscription state.

All new user-owned records must use opaque Auth ownership, forced row-level security,
deny direct writes where reviewed RPCs are required, cascade through the account
deletion path, and remain absent from logs, fixtures, screenshots, prompts, and
repository content. Tests use synthetic values only.

Before implementation, complete a privacy and legal review covering sensitive health
information, the FTC Health Breach Notification Rule, financial and relationship
content, agent authorization, analytics, payments, retention, export, and deletion.

## Ordered backlog

### Phase 0 — validation setup (weeks 1–2)

1. Interview 20–30 target users who already use AI for personal improvement.
2. Recruit at least 10 design partners with a recurring problem ProtoTower addresses.
3. Test the personal-systems positioning, four-question flow, and $49–$72 annual offer.
4. Approve the system/protocol/tower vocabulary and representative examples from all
   four life domains.
5. Approve data, privacy, analytics, agent-authorization, payment, and deletion designs.

### Phase 1 — trustworthy account foundation (weeks 2–4)

1. Correct signed-in navigation and account actions.
2. Add pseudonym onboarding, suggestions, editing, validation, and isolation tests.
3. Add domain-neutral system intent, success definition, timeframe, and tracking model.
4. Extend account export and deletion for every new record before enabling the UI.

### Phase 2 — core system loop (weeks 4–7)

1. Add catalog-to-system actions and preserve selection through authentication.
2. Add original protocols and private modifications with provenance and revisions.
3. Add the short system setup and element editor.
4. Add the review-and-revise loop.
5. Complete accessibility, mobile viewport, concurrency, isolation, and outage tests.

### Phase 3 — agent and commercial proof (weeks 7–10)

1. Implement the narrow scoped read, proposal, approval, audit, and event-feed contract.
2. Add first-party privacy-respecting milestone events.
3. Add founding-plan checkout, cancellation, payment-state isolation, and support flow.
4. Onboard design partners and observe complete product loops without handling private
   content outside the product.

### Phase 4 — retention evaluation (weeks 10–12)

1. Complete week-one and week-four cohort reviews.
2. Interview activated, retained, paying, and churned participants.
3. Measure agent-connected and human-only retention separately.
4. Publish a redacted milestone validation record and explicit continue, revise, or
   stop recommendation.

## Acceptance criteria

### Product behavior

1. A signed-in user sees their pseudonymous account control and no **Sign in** action.
2. A new user can accept, regenerate, or replace a suggested pseudonym.
3. A user can create a system without setting a goal or deadline.
4. A user can complete the four-question setup with brief answers and elaborate later.
5. A catalog protocol can become a new system's base in one continuous flow.
6. Additional protocols can be added to the stack without changing their catalog
   versions.
7. A user can create an original protocol and a private catalog modification with
   distinguishable provenance and revision history.
8. A user can complete a review and retain, revise, pause, or replace a component.
9. A scoped agent can read only its authorized system and submit an idempotent proposal.
10. No agent proposal mutates the system until the user approves it.
11. Revocation blocks subsequent reads and proposals and is visible in the audit trail.
12. Account export and deletion cover every new user-owned record.

### Validation thresholds

These thresholds were accepted by the owner on 2026-08-28. They must not be changed
after recruitment begins without recording the change and rationale.

- At least 50 activated design-partner accounts
- At least 60% of activated accounts create a meaningful first system
- Median time to first useful system of 10 minutes or less
- At least 30% of activated users return in week four
- At least 20% complete a system review
- At least 10 users pay without bundled individual consulting
- At least 20% use export or connect an agent
- At least 50 paying users by the end of month six after kickoff
- Monthly paid retention of at least 70% once a measurable paid cohort exists
- Support plus managed-AI cost below 20% of subscription revenue
- No unresolved cross-user data exposure, private-content logging, unauthorized agent
  write, payment-state inconsistency, or deletion gap

## Decision rule

- **Continue:** activation, retention, review, and willingness-to-pay thresholds are
  substantially met with no unresolved trust failure.
- **Revise:** users demonstrate recurring value but positioning, onboarding, pricing,
  or one workflow prevents one or more thresholds.
- **Stop or narrow:** fewer than 20 users will pay after six months of direct founder
  access and iteration, week-four retention remains below 20%, or the product requires
  unsafe data practices or unsustainable service effort to retain users.

Failure to meet a metric is evidence, not permission to add unrelated features.

## Completion gate

Milestone 6 is complete only when:

1. The owner accepts this scope and the pre-recruitment metric thresholds.
2. Architecture, privacy, threat-model, retention, deletion, payment, analytics, and
   agent-authorization decisions are reviewed before their implementations merge.
3. Forward-only migrations, generated types, RLS, RPCs, audit behavior, and cascade
   coverage pass from a clean database reset.
4. Formatting, linting, strict typing, units, builds, dependency review, secret scan,
   accessibility, security, performance, and full browser gates pass.
5. Protected staging acceptance proves two-user isolation, pseudonym privacy, system
   creation and review, revisions, export/deletion, agent proposal approval and
   revocation, payment isolation, and redacted product measurement.
6. The accepted revision deploys through the existing protected production process.
7. A redacted validation record reports exact cohort definitions, metric results,
   costs, incidents, limitations, and the continue/revise/stop decision.
