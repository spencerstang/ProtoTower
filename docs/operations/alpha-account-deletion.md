# Invite-only alpha account deletion

Milestone 3 uses operator-assisted deletion. A designated account owner must verify
the request through the private support channel, then delete the user in the Supabase
Auth dashboard for the correct environment. Do not copy the email address, Auth user
ID, tower titles, token, or session details into a repository, issue, chat, command
history, screenshot, or shared log.

The database foreign key from `personal_towers.owner_id` to `auth.users.id` cascades
through the user's towers and tower items. After deletion, verify only that the Auth
record is absent and that no owned application rows remain; retain no query output
containing identifiers or private titles. Ask the user to confirm that a new magic
link is no longer delivered and that `/towers` requires authentication.

If deletion or cascade verification fails, stop, preserve only non-sensitive
operational evidence, and treat the account as not deleted. Correct schema defects
with a reviewed forward-only migration; never manually orphan or reassign private
tower rows.
