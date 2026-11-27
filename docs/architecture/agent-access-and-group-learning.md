# Agent access and group learning roadmap

Status: requested; planned after the setup usability release. These capabilities are not yet shipped.

ProtoTower connects goals/systems, protocol stacks/treatments, and outcomes/metrics. The minimum useful tower is one goal, two relevant protocols, and one outcome, growing over time. These relationships are many-to-many; comparable overlap can support learning across participants.

The [learning framework](../product/learning-framework.md) governs future statistics:
track goal–protocol–outcome patterns, prioritize all-success/all-failure signals
with visible sample sizes and uncertainty, compare absolute and relative success
for protocols pursuing the same goal, then assess incremental benefit from stacks.

## 1. Agent access

Provide owner-bound agent sign-in using scoped, revocable, expiring tokens. Store token hashes, show credentials only once, and expose scope and last-use controls. Introduce `/api/v1` with documented authorization, pagination, validation, rate limits, and stable error contracts. An MCP server should reuse the same domain services and permissions. Separate catalog read, private tower read, tower write, and observation write scopes. Audit metadata must exclude private response text and token secrets.

Acceptance: a token can perform only its granted operations; expiry and revocation take effect; cross-owner requests fail; MCP and HTTP have equivalent authorization; existing browser sign-in continues working.

## 2. Machine-readable discovery

Publish `llms.txt`, a versioned JSON protocol catalog, and an OpenAPI specification. Discovery exposes published protocol definitions and public product documentation. Include protocol/version identifiers, steps, evidence references, cautions, response schemas, scope requirements, and links between formats. Never include private goals, observations, identities, drafts, or credentials. Validate the catalog and spec in CI against the implemented contracts.

Acceptance: an agent can discover a published protocol and determine the authorized API operations without scraping the UI. Version changes are explicit and private resources remain protected.

## 3. Opt-in group statistics per protocol

Make contribution consent explicit and separate from display identity and tower visibility. Existing shared/anonymous preferences alone must not retroactively authorize contributions. Provide withdrawal controls and explain what is retained or recomputed. Aggregate by published protocol/version and compatible metric definitions, units, and observation windows; retain context about overlapping protocol stacks. Do not combine unrelated custom labels or incompatible units.

Show distinct participant count and observation count separately, the eligible time window, missingness, and the applicable suppression rule. Select and document a minimum participant threshold before publication; suppress small groups and prevent differencing across filters. Exclude free-text responses, private “My version” notes, and identifiers from public aggregates. Use the pinned library ID and version rather than display names for aggregation. Read access to group statistics must not grant access to underlying records. Explain that observational associations do not establish treatment effects.

Acceptance: only opted-in eligible records contribute; withdrawing consent updates aggregates; repeated readings do not inflate participant counts; small cohorts stay suppressed; protocol pages show sample sizes; tests prove isolation and suppression behavior.

## Account-wide agent parity (November 25 product decision)

The account owner authorizes an assistant once for all current and future Towers. Every user-facing capability should have a documented agent equivalent with the same ownership boundaries and user-visible effects. Routine writes can apply directly. Explicit proposals remain available when the user wants review. This direction supersedes the one-system, proposal-only target in the original milestone 6 plan.

| Workflow                                                                            | Initial HTTP coverage                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| Discover all owned Towers and read configured protocols and measurement definitions | List or read by Tower ID                         |
| Add a numeric, hours, or 1–5 measurement to a configured Tower                      | Save directly or propose, then review in Account |
| Create or edit Towers, library blocks, protocols, and other measurement types       | Planned                                          |
| Log, correct, and export observations and check-ins                                 | Planned                                          |
| Manage account settings, sharing, and deletion                                      | Planned, with the same confirmations as the site |
| Reminder preferences and monthly findings                                           | Add equivalent tools when these ship             |

Use the versioned API from tool-capable clients. Connect through Account → Connect my assistant, import the OpenAPI definition, then store the expiring key in the client's secure Bearer credential setting. Revoke the connection on the same page. The initial release supports one active connection per account. A remote MCP adapter and native account linking are future work.
