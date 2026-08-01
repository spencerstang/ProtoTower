import { describe, expect, it } from "vitest";
import {
  anonymousPrincipal,
  authorizeOwner,
  denyByDefault,
  parseAuthenticatedPrincipal,
  parseEmailAddress,
  principalIdSchema,
} from "./index";

describe("authorization foundation", () => {
  it("denies access until a reviewed policy exists", () => {
    expect(denyByDefault.allowed).toBe(false);
    expect(denyByDefault.reason).toBe("no_reviewed_policy");
  });

  it("parses a strict authenticated principal", () => {
    expect(parseAuthenticatedPrincipal({ id: "30000000-0000-4000-8000-000000000001" })).toEqual({
      kind: "authenticated",
      id: "30000000-0000-4000-8000-000000000001",
    });
    expect(() =>
      parseAuthenticatedPrincipal({
        id: "30000000-0000-4000-8000-000000000001",
        email: "private@example.test",
      }),
    ).toThrow();
  });

  it("allows only the matching owner", () => {
    const ownerId = principalIdSchema.parse("30000000-0000-4000-8000-000000000001");
    const otherId = principalIdSchema.parse("30000000-0000-4000-8000-000000000002");

    expect(authorizeOwner(anonymousPrincipal, ownerId)).toEqual({
      allowed: false,
      reason: "anonymous",
    });
    expect(authorizeOwner({ kind: "authenticated", id: ownerId }, ownerId)).toEqual({
      allowed: true,
      reason: "owner",
    });
    expect(authorizeOwner({ kind: "authenticated", id: otherId }, ownerId)).toEqual({
      allowed: false,
      reason: "owner_mismatch",
    });
  });
});

describe("email input", () => {
  it("normalizes a valid address without exposing provider rules", () => {
    expect(parseEmailAddress("INVITED@EXAMPLE.TEST")).toBe("invited@example.test");
  });

  it("rejects malformed input", () => {
    expect(() => parseEmailAddress("not-an-address")).toThrow();
  });
});
