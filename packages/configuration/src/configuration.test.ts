import { describe, expect, it } from "vitest";
import {
  createStructuredLogger,
  featureFlags,
  isFeatureEnabled,
  parseServerEnvironment,
} from "./index";

describe("environment validation", () => {
  it("accepts a minimal local environment", () => {
    expect(parseServerEnvironment({ APP_ENV: "local" }).APP_ENV).toBe("local");
  });

  it("requires protected diagnostics in production", () => {
    expect(() => parseServerEnvironment({ APP_ENV: "production" })).toThrow();
  });

  it("rejects incomplete Supabase configuration", () => {
    expect(() =>
      parseServerEnvironment({
        APP_ENV: "local",
        SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toThrow();
  });

  it("rejects insecure staging configuration", () => {
    expect(() =>
      parseServerEnvironment({
        APP_ENV: "staging",
        PUBLIC_APP_URL: "http://staging.example.com",
        ADMIN_DIAGNOSTICS_TOKEN: "too-short",
      }),
    ).toThrow();
  });

  it("accepts complete staging configuration", () => {
    const environment = parseServerEnvironment({
      APP_ENV: "staging",
      PUBLIC_APP_URL: "https://staging.example.com",
      ADMIN_DIAGNOSTICS_TOKEN: "test-token-that-is-at-least-32-chars",
      BUILD_TIME: "2026-07-28T12:00:00Z",
    });

    expect(environment.APP_ENV).toBe("staging");
  });
});

describe("feature flags", () => {
  it("enables only the reviewed read-only catalog capability", () => {
    const enabledFeatures = Object.entries(featureFlags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    expect(enabledFeatures).toEqual(["protocolCatalog"]);
    expect(isFeatureEnabled("protocolCatalog")).toBe(true);
    expect(isFeatureEnabled("authentication")).toBe(false);
    expect(Object.isFrozen(featureFlags)).toBe(true);
  });
});

describe("structured logging", () => {
  it("redacts sensitive values", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      write: (line) => lines.push(line),
    });
    logger.info("request", {
      token: "secret-value",
      nested: { email: "person@example.com" },
      error: new Error("private diagnostic detail"),
      ok: true,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("secret-value");
    expect(lines[0]).not.toContain("person@example.com");
    expect(lines[0]).not.toContain("private diagnostic detail");
    expect(lines[0]).toContain("[REDACTED]");
    expect(lines[0]).toContain('"name":"Error"');
  });
});
