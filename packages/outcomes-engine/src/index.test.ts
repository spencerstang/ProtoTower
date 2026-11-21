import { describe, expect, it } from "vitest";
import {
  calmCheckInSummary,
  formatMetricReading,
  metricPresetMatches,
  metricPresets,
  outcomesEngineStatus,
  parseMetricSubmission,
  readingFromPayload,
  readingPayload,
  metricDraftSchema,
  shapesForKind,
} from "./index";

const empty = { numeric: null, secondary: null, text: null, completion: null };

describe("tower outcome metrics", () => {
  it("publishes presets with a final, ongoing, and proxy measure", () => {
    expect(outcomesEngineStatus).toBe("tower-outcome-metrics");
    expect(metricPresets.filter((preset) => preset.kind === "final").length).toBeGreaterThan(0);
    expect(metricPresets.filter((preset) => preset.kind === "ongoing").length).toBeGreaterThan(0);
    expect(metricPresets.filter((preset) => preset.kind === "proxy").length).toBeGreaterThan(0);
    expect(shapesForKind("final")).toEqual([
      "number",
      "text",
      "scale_1_5",
      "complete_incomplete",
      "percent",
    ]);
    expect(metricPresetMatches("goal-complete", "final", "complete_incomplete")).toBe(true);
    expect(metricPresetMatches("goal-complete", "ongoing", "weight")).toBe(false);
  });

  it("requires a final answer and lets ongoing measures be skipped", () => {
    expect(
      parseMetricSubmission({ kind: "ongoing", shape: "weight" }, { ...empty, skipped: true }),
    ).toEqual({ skipped: true });
    expect(() =>
      parseMetricSubmission(
        { kind: "final", shape: "complete_incomplete" },
        { ...empty, skipped: true },
      ),
    ).toThrow();
  });

  it("parses each measurement shape and rejects a mixed submission", () => {
    expect(
      parseMetricSubmission(
        { kind: "final", shape: "complete_incomplete" },
        { ...empty, skipped: false, completion: "incomplete" },
      ),
    ).toEqual({ skipped: false, shape: "complete_incomplete", completion: "incomplete" });
    expect(
      parseMetricSubmission(
        { kind: "ongoing", shape: "blood_pressure" },
        { ...empty, skipped: false, numeric: "120", secondary: "80" },
      ),
    ).toEqual({ skipped: false, shape: "blood_pressure", systolic: 120, diastolic: 80 });
    expect(formatMetricReading({ skipped: false, shape: "percent", numeric: 80 })).toBe("80%");
    expect(() =>
      parseMetricSubmission(
        { kind: "ongoing", shape: "weight" },
        { ...empty, skipped: false, numeric: "180", text: "note" },
      ),
    ).toThrow();
    expect(() =>
      parseMetricSubmission(
        { kind: "ongoing", shape: "blood_pressure" },
        { ...empty, skipped: false, numeric: "80", secondary: "120" },
      ),
    ).toThrow();
  });

  it("keeps the saved summary factual", () => {
    const summary = calmCheckInSummary(["Goal complete · Incomplete"], []);
    expect(summary.title).toBe("Check-in saved.");
    expect(summary.details).toEqual(["Goal complete · Incomplete"]);
    expect(summary.closing).toBe("This is a private record of the period.");
    expect(summary.closing.toLowerCase()).not.toContain("fail");
    expect(summary.closing.toLowerCase()).not.toContain("streak");
  });

  it("round-trips a stored reading", () => {
    const reading = readingFromPayload("hours", {
      skipped: false,
      numericValue: 7.5,
      secondaryNumeric: null,
      textValue: null,
      completion: null,
    });
    expect(reading).toEqual({ skipped: false, shape: "hours", numeric: 7.5 });
  });
});

describe("generic measurements", () => {
  it("preserves decimal precision, zero, and signed values through storage", () => {
    for (const numeric of ["3.250000", "0", "-0.125", "9999999999999999.123456789012"]) {
      const reading = parseMetricSubmission(
        { kind: "final", shape: "number" },
        { ...empty, skipped: false, numeric },
      );
      expect(formatMetricReading(reading)).toBe(numeric);
      expect(readingFromPayload("number", readingPayload(reading))).toEqual(reading);
    }
  });
  it("rejects ambiguous or unbounded numeric input", () => {
    for (const numeric of ["NaN", "Infinity", "1e3", "01", "1,234", "1.1234567890123"]) {
      expect(() =>
        parseMetricSubmission(
          { kind: "final", shape: "number" },
          { ...empty, skipped: false, numeric },
        ),
      ).toThrow();
    }
  });
  it("supports text in every role, while only numeric measures accept units", () => {
    for (const kind of ["final", "ongoing", "proxy"] as const) {
      expect(
        parseMetricSubmission(
          { kind, shape: "text" },
          { ...empty, skipped: false, text: "Synthetic observation" },
        ),
      ).toEqual({ skipped: false, shape: "text", text: "Synthetic observation" });
      expect(
        metricDraftSchema.safeParse({
          kind,
          shape: "number",
          label: "Concentration",
          presetKey: null,
          unit: "units/mL",
        }).success,
      ).toBe(true);
      expect(
        metricDraftSchema.safeParse({
          kind,
          shape: "text",
          label: "Note",
          presetKey: null,
          unit: "units/mL",
        }).success,
      ).toBe(false);
    }
  });
});
