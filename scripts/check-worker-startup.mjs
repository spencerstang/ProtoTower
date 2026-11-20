import { setTimeout } from "node:timers/promises";

// A Next.js Node build does not exercise the OpenNext/Workers startup path.
let lastStatus = "not listening";
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch("http://127.0.0.1:8787/api/health", {
      signal: AbortSignal.timeout(2_000),
    });
    lastStatus = String(response.status);
    if (response.ok && (await response.json()).status === "ok") {
      console.log("Cloudflare Worker startup and health route passed.");
      process.exit(0);
    }
  } catch {
    // The dev server may still be compiling or starting.
  }
  await setTimeout(1_000);
}
throw new Error(`Cloudflare Worker startup failed (last response: ${lastStatus}).`);
