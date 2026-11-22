# Consistent protocol capacity

Creating a tower and finishing an existing tower both accept up to 20 protocols, matching later edits. Library and custom protocols count toward the same total. Users can progressively add up to 20 custom protocol fields, with distinct labels beyond the third. Guidance, selection controls, domain validation and database creation agree on the limit. This removes the previous three-protocol onboarding restriction; the one-goal/two-protocol/one-outcome minimum useful starting point remains guidance rather than an upper limit.

Apply migration `20261122010000_protocol_setup_capacity.sql` before deploying the web application. It preserves the existing create RPC signature, authentication, ownership checks, validation and grants. The previous application remains compatible with the larger database cap.

Regressions cover four and twenty protocols, rejection above twenty, all twenty form slots, database create/save boundaries, and a mixed library/custom four-protocol tower after reload. Deployment evidence and verification results are recorded in the pull request.

## Measurement clarity

Check-ins use one Measurements section rather than Ongoing/Completion buckets. Each measure shows its scale/unit and whether it is required. Protocol adherence stays under What you did. Subjective sleep quality is a distinct 1–5 preset with explicit very-poor to excellent anchors; Sleep duration records hours. Existing stored names, definitions and readings are not rewritten. Management explains that renaming does not change the response type and offers a direct link to add a measure with another type, preserving the meaning of earlier entries.

Also apply `20261122020000_sleep_quality_measure.sql` before releasing the new preset. It only extends the existing preset validation function and changes no saved rows.
