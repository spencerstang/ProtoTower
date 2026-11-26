import { it, expect } from "vitest";
import { measurementProposalSchema } from "./index";
it("requires explicit write intent and only permits custom units for numeric measurements", () => {
  const base = {
    revision: 0,
    requestId: crypto.randomUUID(),
    shape: "rating",
    label: "Practice quality",
  };
  expect(measurementProposalSchema.safeParse(base).success).toBe(false);
  expect(
    measurementProposalSchema.safeParse({ ...base, mode: "save", unit: "points" }).success,
  ).toBe(false);
  expect(
    measurementProposalSchema.safeParse({
      ...base,
      mode: "propose",
      shape: "number",
      unit: "minutes",
    }).success,
  ).toBe(true);
});
