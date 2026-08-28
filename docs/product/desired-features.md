# Desired product features

Status: Product feedback backlog; selected validation features are proposed for
Milestone 6, while broader domain and interoperability expansion remain unassigned

This document captures desired ProtoTower behavior that requires product design,
security review, and milestone planning before implementation. It does not expand an
accepted milestone by itself.

The proposed validation slice is specified in
`docs/product/milestone-6-systems-beta-validation.md`.

## Systems over goals

ProtoTower should favor systems over goals whenever practical. A user may still set
a specific goal, target, or milestone, but the product's primary job is to help a
person combine protocols into an effective system that can be practiced, observed,
reviewed, and improved.

- Present a **system** as the durable operating structure a person is building.
- Present a **protocol** as a defined method or component within that system.
- Present a **tower** as the user's visible stack of protocols that together form the
  system.
- Treat goals, target dates, and success thresholds as optional directional or
  evaluative inputs rather than the mandatory top-level organizing model.
- Prefer recurring practices, review cadences, feedback, and revision over countdowns,
  completion pressure, or finish-line language.
- Allow a system to remain valuable after a goal is reached and to evolve when the
  user's circumstances or understanding changes.
- Use outcome definitions to determine whether the system is helping, without
  reducing every domain to a score or binary completion state.

## Multi-domain product direction

ProtoTower is broader than a health product. Its four major life domains are:

1. **Health & Fitness**
2. **Relationships**
3. **Financial Well-Being**
4. **Mental Optimization**

It is acceptable to launch and learn within one domain first, including Health &
Fitness, but product and architecture decisions must not make the other domains
difficult to add later.

- Keep towers, systems, protocols, elements, optional goals, timeframes, success
  definitions, tracking, revisions, pseudonyms, and ownership domain-neutral at their
  core.
- Treat domain-specific vocabulary, guidance, measurements, safety notices, evidence
  standards, and catalog presentation as extensions rather than universal fields.
- Do not assume every protocol concerns a medical condition, physical behavior,
  biometric measure, monetary amount, personal relationship, or productivity score.
- Allow a tower or protocol to belong to one primary domain initially without making
  cross-domain towers impossible later.
- Review privacy, safety, moderation, and evidence requirements separately for each
  domain before enabling its public catalog or guided recommendations.
- Test new shared data models and interfaces against representative examples from all
  four domains, even when only one domain is enabled in the current milestone.

## Agent-first interoperability

ProtoTower should be designed for both direct human use and authorized use by a
person's AI agent. In many sessions the agent, rather than the person, may be the
immediate operator. Agent access is not enabled in the current beta, but shared
models and workflows must preserve a clean path to it from the start.

### Incoming feed

- Provide a stable, versioned, machine-readable command surface for authorized agents
  to propose or perform the same meaningful actions available to a person, including
  creating and revising towers or protocols, adding stack elements, recording
  observations, and reading current state.
- Model commands explicitly instead of requiring agents to imitate browser clicks.
- Support idempotency keys, optimistic concurrency, validation, dry-run or preview
  where appropriate, and structured errors so retries are safe and understandable.
- Distinguish suggestions awaiting human approval from actions the user has delegated
  to the agent.

### Outgoing feed

- Provide a stable, versioned, machine-readable feed of user-authorized changes and
  relevant state transitions.
- Make changes available through a replayable cursor-based feed; add webhooks or
  subscriptions only behind the same event contract so polling and push delivery do
  not produce different meanings.
- Include event identity, time, actor type, affected resource, revision, provenance,
  and enough context for an agent to reconcile state without exposing unrelated
  private data.
- Preserve a complete distinction between user-authored, agent-proposed,
  agent-executed, system-generated, and imported content.

### Trust and control

- Use explicit user authorization with narrow resource and action scopes, expiration,
  revocation, and deny-by-default behavior. Never give an agent a user's browser
  session or unrestricted account credential.
- Make consequential agent actions reviewable and attributable through human-readable
  decision traces and an append-only audit history.
- Let users inspect connected agents, their permissions, recent activity, pending
  proposals, and revoke access immediately.
- Apply stronger confirmation and safety boundaries where a domain or action warrants
  them; agent convenience must not bypass health, financial, privacy, or relationship
  protections.
- Keep the underlying interoperability contract provider-neutral. REST, MCP, SDKs,
  imports, exports, and webhooks may expose the contract later, but no single agent or
  AI vendor should define the domain model.
- Treat bulk import and export as first-class, user-controlled interoperability paths
  with stable identifiers, versioning, provenance, and lossless round trips where
  feasible.

## Authenticated account navigation

- When a visitor is signed in, replace the **Sign in** navigation action with an
  account control.
- The account control should identify the current pseudonymous account and provide
  access to appropriate account actions, including sign out.
- Do not expose the account email address as the primary identity in the product UI.

## Pseudonymous identity

- Support a user-chosen pseudonym as the normal in-product identity because many
  ProtoTower users will not want to operate under their legal or email identity.
- During setup, offer a memorable, cool-sounding generated pseudonym as the default.
- Let the user accept the suggestion, generate another suggestion, or enter their own
  pseudonym.
- Make the pseudonym editable later without changing the underlying authentication
  identity or ownership of private towers.
- Define uniqueness, moderation, impersonation, privacy, and account-recovery rules
  before implementation. Email addresses must remain private authentication data.

## Use a catalog protocol in a tower

- Every protocol catalog card and protocol detail view should offer an immediate
  **Use in my tower** action for authenticated users.
- The first protocol selected for a new tower becomes its base.
- Subsequent selections add protocols to the tower's stack.
- The flow should allow the user to choose an existing tower or start a new one
  without losing the protocol they selected.
- A user may later adapt a catalog protocol through a private modification while the
  original catalog source and version remain identifiable.

## Create and adapt protocols

- Let users create a private protocol from scratch; protocol creation must not require
  selecting an existing catalog protocol.
- Also let users create a private modification of an existing protocol without
  overwriting the source protocol or its published version.
- Start with a short, intelligent setup that asks:

  1. **What are you trying to accomplish?**
  2. **How will you know if you were successful?**
  3. **What is the timeframe?**
  4. **How will you track it?**

- Use those answers to propose a concise initial protocol structure and only the
  setup options that are relevant to the stated outcome.
- Let users choose no fixed timeframe, a target date, a duration, or a recurring
  review cadence rather than forcing an arbitrary deadline.
- Offer lightweight tracking suggestions derived from the success definition, while
  allowing a custom method or no tracking. Tracking should favor understandable,
  user-controlled observations over scores, streak pressure, or unsupported health
  claims.
- Let the user add, remove, reorder, and define protocol elements from scratch.
- Keep initial setup brief, then allow progressive elaboration as the user learns,
  practices, or refines the protocol.
- Preserve revision history and make the difference between a catalog protocol, a
  private modification, and an original private protocol clear.

## Planning notes

Before scheduling implementation, define the data model and privacy boundary for
domains, pseudonyms, original protocols, protocol modifications, success criteria,
revision history, agent grants, commands, events, provenance, and audit records. Add
authorization and isolation tests for every new user-owned record, contract tests for
machine interfaces and safe retry behavior, plus browser tests for signed-in
navigation and the catalog-to-tower flow.
