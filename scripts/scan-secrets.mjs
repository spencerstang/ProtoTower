import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const excluded = new Set([
  ".git",
  "node_modules",
  ".next",
  ".open-next",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".jsonc",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".sql",
  ".sh",
  ".txt",
  ".example",
  "",
]);

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{30,}/,
  /sk_live_[A-Za-z0-9]{20,}/,
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
];

async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await files(path)));
    } else if (textExtensions.has(extname(entry.name)) || entry.name.startsWith(".env")) {
      output.push(path);
    }
  }
  return output;
}

const findings = [];
for (const path of await files(".")) {
  const text = await readFile(path, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      findings.push(`${relative(".", path)} matched ${pattern}`);
    }
  }
}

if (findings.length > 0) {
  console.error(`Potential secrets detected:\n${findings.join("\n")}`);
  process.exit(1);
}

console.log("Repository secret scan passed.");
