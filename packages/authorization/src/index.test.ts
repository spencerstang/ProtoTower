import { describe, expect, it } from "vitest";
import { denyByDefault } from "./index";

describe("authorization foundation", () => {
  it("denies access until a reviewed policy exists", () => {
    expect(denyByDefault.allowed).toBe(false);
    expect(denyByDefault.reason).toContain("No Milestone 1 authorization policy");
  });
});
