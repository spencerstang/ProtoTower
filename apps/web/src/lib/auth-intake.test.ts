import { describe, expect, it } from "vitest";
import {
  createAuthIntakeCookie,
  parseAuthEmailOtpType,
  parseAuthIntakeCookie,
  parseAuthTokenHash,
} from "./auth-intake";

describe("auth intake token", () => {
  it("accepts a bounded URL-safe token hash", () => {
    expect(parseAuthTokenHash("a".repeat(64))).toBe("a".repeat(64));
  });

  it.each([undefined, null, "short", "a".repeat(257), "a".repeat(40) + "+"])(
    "rejects malformed input %#",
    (input) => {
      expect(parseAuthTokenHash(input)).toBeNull();
    },
  );
});

describe("auth intake cookie", () => {
  it.each(["email", "signup"] as const)("round-trips a %s token", (type) => {
    const tokenHash = "a".repeat(64);
    expect(parseAuthIntakeCookie(createAuthIntakeCookie(type, tokenHash))).toEqual({
      tokenHash,
      type,
    });
  });

  it.each(["recovery", "invite", null, undefined])("rejects unsupported OTP type %#", (type) => {
    expect(parseAuthEmailOtpType(type)).toBeNull();
  });

  it.each(["email:short", `recovery:${"a".repeat(64)}`, "malformed", null])(
    "rejects malformed cookie %#",
    (input) => {
      expect(parseAuthIntakeCookie(input)).toBeNull();
    },
  );
});

describe("post-authentication destination", () => {
  it("round-trips validated tower setup paths in the intake cookie", () => {
    const tokenHash = "a".repeat(64);
    const next = "/towers/20000000-0000-4000-8000-000000000001/setup";
    expect(parseAuthIntakeCookie(createAuthIntakeCookie("email", tokenHash, next))).toEqual({
      type: "email",
      tokenHash,
      next,
    });
  });

  it.each([
    "//elsewhere.test",
    "/towers/%2f%2felsewhere.test",
    "/towers/../auth",
    "/towers/other",
    "/account?next=elsewhere",
  ])("rejects the destination %s", (next) => {
    const tokenHash = "a".repeat(64);
    expect(parseAuthIntakeCookie(createAuthIntakeCookie("email", tokenHash, next))).toEqual({
      type: "email",
      tokenHash,
    });
  });
});
