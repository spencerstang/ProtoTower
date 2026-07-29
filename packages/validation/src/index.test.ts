import { describe, expect, it } from "vitest";
import { nonEmptyTrimmedString, parseUnknown } from "./index";

describe("validation helpers", () => {
  it("trims validated strings", () => {
    expect(parseUnknown(nonEmptyTrimmedString, "  protocol  ")).toBe("protocol");
  });

  it("rejects unknown invalid input", () => {
    expect(() => parseUnknown(nonEmptyTrimmedString, 42)).toThrow();
  });
});
