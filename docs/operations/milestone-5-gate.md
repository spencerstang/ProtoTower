# Milestone 5 acceptance gate

Do not cut DNS or enable public signup until every required item is observed.

## Owner and policy

- [ ] Quiet-launch open-beta scope in ADR 0014 remains unchanged.
- [ ] Owner approves the published privacy notice and seven-day deletion commitment.
- [ ] A monitored `@prototower.ai` support mailbox receives and sends a test message.

## Provider isolation and security

- [ ] Production Cloudflare, Supabase, GitHub environment, tokens, passwords, Auth
      users, and backups are separate from staging.
- [ ] Email signup and confirmation are enabled; anonymous sign-in and manual account
      linking remain disabled.
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
- [ ] Incident contacts, signup/email disable steps, Worker rollback, and
      forward-only database recovery are rehearsed.

## DNS and launch

- [ ] Owner gives an explicit DNS go/no-go.
- [ ] `https://prototower.ai` serves the accepted SHA over HTTPS.
- [ ] `www.prototower.ai` redirects permanently to the canonical root.
- [ ] Post-cutover health, catalog, privacy, deletion, auth, headers, and rollback
      checks pass.
- [ ] Synthetic two-user acceptance on the canonical domain proves isolation,
      record/undo, cascade, outage scoping, cleanup, and no private logging.
- [ ] Human screen-reader acceptance passes on the canonical domain.
- [ ] A newly entered synthetic address receives the beta notice, creates an account,
      and completes scanner-safe confirmation without operator provisioning.
