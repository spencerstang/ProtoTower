import { access } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "apps/web",
  "packages/database",
  "packages/validation",
  "packages/ui",
  "packages/protocol-engine",
  "packages/tracking-engine",
  "packages/outcomes-engine",
  "packages/analytics-engine",
  "packages/authorization",
  "packages/audit",
  "packages/notifications",
  "packages/ai-interoperability",
  "packages/configuration",
  "supabase/migrations",
  "supabase/seed",
  "supabase/tests",
  "tests/end-to-end",
  "tests/security",
  "tests/accessibility",
  "tests/performance",
  "docs/product",
  "docs/architecture",
  "docs/architecture/dependencies.md",
  "docs/decisions/0009-read-only-protocol-catalog.md",
  "docs/architecture/milestone-1-handoff.md",
  "docs/decisions",
  "docs/security",
  "docs/operations",
  "docs/operations/health-checks.md",
  "docs/operations/milestone-1-gate.md",
  "docs/operations/milestone-2-gate.md",
  "docs/releases",
  "docs/releases/milestone-1-validation.md",
  "docs/releases/milestone-2-validation.md",
  "docs/security/threat-model-protocol-catalog.md",
  "scripts",
  ".github/workflows",
  "AGENTS.md",
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
];

const missing = [];
for (const path of required) {
  try {
    await access(resolve(path));
  } catch {
    missing.push(path);
  }
}

if (missing.length > 0) {
  console.error(`Missing required repository paths:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`Repository structure check passed (${required.length} required paths).`);
