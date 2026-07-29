import { describe, expect, it } from "vitest";
import { StatusPill } from "./index";

describe("StatusPill", () => {
  it("exports a reusable React component", () => {
    expect(typeof StatusPill).toBe("function");
  });
});
