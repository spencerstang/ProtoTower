import { describe, expect, it } from "vitest";
import { validateSetupForm } from "./setup-form-state";

function setup(): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Synthetic goal",
    customTitle1: "First practice",
    customHowTo1: "Do the first practice.",
    customTitle2: "Second practice",
    customHowTo2: "Do the second practice.",
    customMetricLabel1: "Concentration",
    customMetricShape1: "number",
    customMetricKind1: "final",
    customMetricUnit1: "units/mL",
    cadence: "weekly",
    audience: "private",
    identity: "named",
  }))
    data.set(key, value);
  return data;
}
describe("setup validation", () => {
  it("accepts one goal, two protocols and a numeric outcome without a completion preset", () => {
    const result = validateSetupForm(setup(), []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.protocols).toHaveLength(2);
    expect(result.draft.metrics[0]).toMatchObject({
      shape: "number",
      kind: "final",
      unit: "units/mL",
    });
  });
  it("identifies the missing response type without changing submitted answers", () => {
    const data = setup();
    data.set("customMetricShape1", "");
    data.delete("customMetricUnit1");
    const before = [...data.entries()];
    expect(validateSetupForm(data, [])).toEqual({
      ok: false,
      errors: [
        { field: "custom-metric-shape-1", message: "Choose what to record for this measure." },
      ],
    });
    expect([...data.entries()]).toEqual(before);
  });
  it("points duplicate protocol names at the second name field", () => {
    const data = setup();
    data.set("customTitle2", "first practice");
    expect(validateSetupForm(data, [])).toMatchObject({
      ok: false,
      errors: [
        { field: "custom-protocol-name-2", message: "Give each protocol a different name." },
      ],
    });
  });
});
