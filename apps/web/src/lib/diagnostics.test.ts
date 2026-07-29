import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "@protostack/configuration";
import { isDiagnosticsRequestAllowed } from "./diagnostics";

describe("administrative build information", () => {
  it("is available in local development", () => {
    expect(
      isDiagnosticsRequestAllowed({
        environment: parseServerEnvironment({ APP_ENV: "local" }),
        authorizationHeader: null,
      }),
    ).toBe(true);
  });

  it("requires a matching token in staging", () => {
    const environment = parseServerEnvironment({
      APP_ENV: "staging",
      PUBLIC_APP_URL: "https://staging.example.com",
      ADMIN_DIAGNOSTICS_TOKEN: "test-token-that-is-at-least-32-chars",
    });

    expect(
      isDiagnosticsRequestAllowed({
        environment,
        authorizationHeader: "Bearer wrong",
      }),
    ).toBe(false);
    expect(
      isDiagnosticsRequestAllowed({
        environment,
        authorizationHeader: "Bearer test-token-that-is-at-least-32-chars",
      }),
    ).toBe(true);
  });
});
