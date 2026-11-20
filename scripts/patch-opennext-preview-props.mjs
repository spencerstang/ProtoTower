import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Backport upstream opennextjs/opennextjs-cloudflare#1356 to the pinned adapter.
// Next.js 16.4 needs the real preview-props manifest during server startup.
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const packagePath = join(dirname(require.resolve("@opennextjs/cloudflare")), "../../package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
if (version !== "1.19.11") {
  throw new Error("Review/remove the preview-props backport when upgrading OpenNext.");
}
const path = join(dirname(packagePath), "dist/cli/build/patches/plugins/load-manifest.js");
const source = await readFile(path, "utf8");
const original = "**/{*-manifest,required-server-files,prefetch-hints}.json";
const patched = "**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json";
if (source.includes(patched)) {
  console.log("OpenNext preview-props backport is already applied.");
} else {
  if (source.split(original).length !== 2) {
    throw new Error("OpenNext manifest loader changed; refusing an unverified patch.");
  }
  await writeFile(path, source.replace(original, patched));
  console.log("Applied OpenNext preview-props manifest backport.");
}
