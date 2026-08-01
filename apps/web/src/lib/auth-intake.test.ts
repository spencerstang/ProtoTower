import { describe, expect, it } from "vitest";
import { parseAuthTokenHash } from "./auth-intake";

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
