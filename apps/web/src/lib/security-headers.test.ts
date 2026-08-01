import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./security-headers";

describe("content security policy", () => {
  it("uses a nonce without production inline-script exceptions", () => {
    const policy = buildContentSecurityPolicy("synthetic-nonce", false);
    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src"));
    expect(scriptDirective).toContain("'nonce-synthetic-nonce'");
    expect(scriptDirective).toContain("'strict-dynamic'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
  });

  it("limits development exceptions to the script directive", () => {
    const policy = buildContentSecurityPolicy("synthetic-nonce", true);
    expect(policy).toContain(
      "script-src 'self' 'nonce-synthetic-nonce' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval'",
    );
  });
});
