# Milestone 5 acceptance gate

Do not admit real users or cut DNS until every required item is observed.

## Owner and policy

- [ ] Invite-only production scope remains unchanged.
- [ ] Owner approves the published privacy notice and seven-day deletion commitment.
- [ ] A monitored `@prototower.ai` support mailbox receives and sends a test message.

## Provider isolation and security

- [ ] Production Cloudflare, Supabase, GitHub environment, tokens, passwords, Auth
      users, and backups are separate from staging.
- [ ] Open signup is disabled; only designated accounts exist.
- [ ] Exact Site URL and single confirmation redirect are configured without wildcards.
- [ ] Resend custom SMTP works with tracking disabled.
- [ ] Provider and Cloudflare sign-in rate limits are configured and tested.
- [ ] Unauthorized diagnostics return 404; authenticated and token-bearing responses
      remain private/no-store with production CSP and secure cookies.

## Verification and operations

- [ ] Full repository, production dependency, database, browser, accessibility,
      security, and performance gates pass from a clean checkout.
- [ ] Protected production migration and Worker deploy accept the exact reviewed SHA.
- [ ] Pre-DNS Worker verification passes public and operational routes without
      attempting canonical-origin authentication.
- [ ] A production backup is observed and restored to a disposable project.
- [ ] Incident contacts, invitation/email disable steps, Worker rollback, and
      forward-only database recovery are rehearsed.

## DNS and admission

- [ ] Owner gives an explicit DNS go/no-go.
- [ ] `https://prototower.ai` serves the accepted SHA over HTTPS.
- [ ] `www.prototower.ai` redirects permanently to the canonical root.
- [ ] Post-cutover health, catalog, privacy, deletion, auth, headers, and rollback
      checks pass.
- [ ] Synthetic two-user acceptance on the canonical domain proves isolation,
      record/undo, cascade, outage scoping, cleanup, and no private logging.
- [ ] Human screen-reader acceptance passes on the canonical domain.
- [ ] Owner gives a separate real-user admission go/no-go.
- [ ] Only then may an approved real user be provisioned and invited.
