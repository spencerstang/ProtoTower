import { it, expect } from "vitest";
import { assistantTowerSnapshot, measurementProposalSchema } from "./index";
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

it("round-trips required and optional ratings using the same assistant shape", () => {
  const requestId = crypto.randomUUID();
  for (const [shape, required] of [
    ["scale_1_5", true],
    ["rating", false],
  ] as const) {
    const snapshot = assistantTowerSnapshot.parse({
      towerId: crypto.randomUUID(),
      goal: "Practice",
      definition: null,
      revision: 0,
      protocols: [],
      measurements: [{ id: crypto.randomUUID(), label: "Quality", shape, required, unit: null }],
    });
    expect(snapshot.measurements[0]).toMatchObject({ shape: "rating", scale: "1–5", required });
    const payload = { mode: "save", requestId, revision: 0, label: "Quality", shape };
    expect(measurementProposalSchema.parse(payload).shape).toBe("rating");
    expect(measurementProposalSchema.safeParse({ ...payload, unit: "points" }).success).toBe(false);
  }
});
