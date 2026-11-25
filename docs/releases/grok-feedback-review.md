# Grok feedback review — November 23, 2026

Reviewed source: `7152c09878df197818f2a301a58a7e6544ea1281` (PRs 43 and 44).
This follow-up makes setup use the Measurements heading and strengthens the
existing browser regression to reproduce two library plus two custom protocols.
The published definitions, private adaptations, storage model, and permissions
remain distinct. No dependency, database, or architecture changes are needed.

## Feedback checklist

| Feedback                                                      | Source evidence                                                                                                  | Verification boundary                                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Save two library plus two custom protocols                    | Form parser handles repeated library selections and all custom slots; creation cap is 20 in domain and migration | Updated unit regression asserts both source IDs, both custom titles, and a private adaptation; browser regression checks all four after reload |
| Private My version notes                                      | Setup and edit controls, `personal_protocol_notes` migration                                                     | Existing browser test saves, changes, and reloads a note; published definition is retained                                                     |
| 20 protocols                                                  | Shared domain cap, progressive custom slots, capacity migration                                                  | Existing twenty-protocol browser and pgTAP coverage                                                                                            |
| Rename preset measurements; show scales                       | Setup display-name controls; management rename action; check-in scale descriptions                               | Browser regression preserves a saved numeric reading after rename                                                                              |
| Saved protocols on tower page                                 | Configured Tower blocks list and count; legacy empty state hidden for configured towers                          | Mixed regression checks 4 of 20 and absence of the old empty message                                                                           |
| Distinct labels and actions                                   | Named protocol fields and save/remove buttons; named metric inputs                                               | Mixed regression checks uniquely addressable protocol save/remove actions                                                                      |
| Plain measurement groups                                      | Setup fieldsets are expanded; check-ins use one Measurements fieldset                                            | Existing twenty-protocol test rejects Ongoing/Completion check-in groups; setup heading now uses Measurements too                              |
| Sleep quality                                                 | Dedicated preset, whole-number 1–5 bounds and endpoint anchors                                                   | Existing browser test checks guidance; unit and pgTAP coverage exist                                                                           |
| Preserve input after save errors                              | Client-retained form plus linked validation errors                                                               | Existing browser correction/resubmission regression                                                                                            |
| Return to requested page after email sign-in                  | Auth-return flow and email templates                                                                             | Existing cross-browser regression; provider template synchronization still requires separate verification                                      |
| Scoped revocable tokens, API/MCP, discovery, group statistics | `docs/architecture/agent-access-and-group-learning.md`                                                           | Planned and unshipped; this usability follow-up does not expand the milestone                                                                  |

The single Measurements requirement describes the check-in form. Expanded setup
groups distinguish required and optional choices and are not evidence that the
check-in change is missing.

## Release evidence and limits

GitHub production run `45051668350` completed successfully for the reviewed SHA.
Its successful Verify production Worker endpoints step checks authenticated
`/api/admin/build-info.gitSha` against that SHA at `DEPLOYMENT_HEALTH_URL`.
This is deployment-time evidence; it does not establish a fresh browser check of
the custom domain. Public `/api/health` intentionally does not report a commit.
User-provided production screenshots show 20-protocol guidance, My version,
expanded setup groups, sleep quality, and scales. No production saves were tested
in this review. Saved browser-origin denial remains a blocker for agent-driven
production QA; no alternate network route was used to the denied origin.

## Local validation

The original checkout predates the reviewed SHA. The source was recovered through
the GitHub connector into an isolated local review directory; the user's checkout
was not overwritten. Shell GitHub access failed DNS resolution. Exact dependency
installation (`pnpm install --offline --frozen-lockfile`) could not complete because
the package registry was unavailable. Existing cached dependencies were used for
available checks, including Next 16.3.6 instead of locked 16.4.2, Zod 4.4.3 instead
of 4.6.6, and Vite 8.1.5 instead of 8.1.6. These are supplemental results, not
exact-lockfile certification. No manifest or lockfile was relaxed.

- `pnpm_config_verify_deps_before_run=false pnpm verify`: formatting, repository
  policy, dependency policy, secret scan, migration validation, lint, strict types,
  and all 132 unit tests passed. Build reached Next startup and failed because the
  sandbox rejected listening on 127.0.0.1 (`EPERM`).
- `docker info --format '{{.ServerVersion}}'`: permission denied to Docker socket.
  Database/browser execution therefore requires CI or a local Docker-capable host.
- `pnpm_config_verify_deps_before_run=false pnpm db:test`: blocked before tests by
  the Supabase CLI attempting a telemetry file write outside writable roots.
- `pnpm_config_verify_deps_before_run=false pnpm test:browsers`: blocked before
  tests when the local catalog server could not listen on 127.0.0.1:54329 (`EPERM`).
- `pnpm_config_verify_deps_before_run=false pnpm audit --audit-level=high`: the
  advisory service could not be reached (`ENOTFOUND`); no audit result is claimed.
- `pnpm_config_verify_deps_before_run=false pnpm verify:static`: passed again after
  the documentation updates.

The pnpm environment flag suppresses automatic dependency reinstallation only;
it does not disable any compiler, lint, test, security, or dependency policy check.
CI must install the committed lockfile and run all quality, browser, accessibility,
performance, database, dependency-audit, and secret-scan gates before merge.

## Rollback and next verification

Revert this follow-up to restore the previous heading and regression test. No data
rollback is needed. After CI passes and the change is deployed, retest a synthetic
two-library/two-custom tower through save, reload, and check-in; leave existing
user towers untouched. Agent token implementation remains a separate scoped phase.
