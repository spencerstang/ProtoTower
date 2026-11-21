# Unmatched starter recovery

An unmatched goal saves a private tower without assigning unrelated wellness protocols.
The creation page explains the limited automatic matching coverage. The saved tower
now links to its existing manual setup form, where the owner can enter their own
steps and outcome. Once saved, that tower renders the configured-tower controls
instead of continuing to display the unmatched starter message.

Medical goals are not assigned a generated treatment plan. The recovery panel directs
owners to use a clinician-agreed plan and distinguishes the wellness catalog from treatment.
No saved user data is rewritten, no database migration or dependency is added, and
matched starter towers keep their existing behavior.

Validation: the authenticated browser regression creates a synthetic unmatched goal,
opens its setup, saves custom steps and a final outcome, and verifies the configured
view survives reload. Full CI, dependency review, and secret scanning are required
before deployment. Deployment results are recorded in the release pull request.

Rollback: redeploy the preceding accepted Worker version. The change is display and
navigation only; manual setup continues to use existing authenticated, revision-checked
server actions and database ownership policies.
