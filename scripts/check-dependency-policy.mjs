import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const bannedPatterns = [
  /openai/i,
  /anthropic/i,
  /segment/i,
  /mixpanel/i,
  /posthog/i,
  /sendgrid/i,
  /resend/i,
  /stripe/i,
];

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const allowedWorkspaceVersion = /^(?:workspace:(?:\*|\^|~|\d+\.\d+\.\d+)|catalog:)$/;

const manifests = ["package.json"];
for (const root of ["apps", "packages"]) {
  for (const child of await readdir(root)) {
    manifests.push(join(root, child, "package.json"));
  }
}

const providerViolations = [];
const versionViolations = [];
for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (bannedPatterns.some((pattern) => pattern.test(name))) {
        providerViolations.push(`${manifestPath}: ${name}`);
      }

      if (
        section !== "peerDependencies" &&
        !exactVersion.test(version) &&
        !allowedWorkspaceVersion.test(version)
      ) {
        versionViolations.push(
          `${manifestPath}: ${section}.${name} uses non-exact version ${version}`,
        );
      }
    }
  }
}

if (providerViolations.length > 0 || versionViolations.length > 0) {
  if (providerViolations.length > 0) {
    console.error(
      `Provider dependencies forbidden in Milestone 1:\n${providerViolations.join("\n")}`,
    );
  }
  if (versionViolations.length > 0) {
    console.error(`Direct dependencies must use exact versions:\n${versionViolations.join("\n")}`);
  }
  process.exit(1);
}

console.log("Dependency policy check passed.");
