# Consistent protocol capacity

Creating a tower and finishing an existing tower both accept up to 20 protocols, matching later edits. Library and custom protocols count toward the same total. Users can progressively add up to 20 custom protocol fields, with distinct labels beyond the third. Guidance, selection controls, domain validation and database creation agree on the limit. This removes the previous three-protocol onboarding restriction; the one-goal/two-protocol/one-outcome minimum useful starting point remains guidance rather than an upper limit.

Apply migration `20261122010000_protocol_setup_capacity.sql` before deploying the web application. It preserves the existing create RPC signature, authentication, ownership checks, validation and grants. The previous application remains compatible with the larger database cap.

Regressions cover four and twenty protocols, rejection above twenty, all twenty form slots, database create/save boundaries, and a mixed library/custom four-protocol tower after reload. Deployment evidence and verification results are recorded in the pull request.
