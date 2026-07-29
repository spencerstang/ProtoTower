# Foundation threat model

Primary Milestone 1 risks are accidental credential disclosure, production-data leakage, insecure administrative diagnostics, dependency compromise, migration drift, and provider lock-in. Controls include synthetic-only seeds, repository and GitHub secret scanning, dependency review, exact package versions, strict environment validation, protected diagnostics, redacted structured logging, security headers, version-controlled migrations, and provider-neutral packages.

Authentication and user-data threats are deliberately deferred because those surfaces do not yet exist.
