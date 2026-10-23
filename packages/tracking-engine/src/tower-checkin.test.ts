import { describe, expect, it } from "vitest";
import {
  currentTowerPeriod,
  nextSpecifiedDate,
  parseTowerCheckInSubmission,
  summarizeCheckIn,
} from "./tower-checkin";

const metrics = [
  {
    id: "40000000-0000-4000-8000-000000000010",
    kind: "ongoing" as const,
    shape: "rating" as const,
    label: "How it feels",
  },
  {
    id: "40000000-0000-4000-8000-000000000011",
    kind: "final" as const,
    shape: "complete_incomplete" as const,
    label: "Goal complete",
  },
];

describe("tower check-in periods", () => {
  it("uses the same period boundary for every cadence", () => {
    const anchorDate = "2026-10-05";
    const today = "2026-10-23";
    expect(currentTowerPeriod({ cadence: "daily", customDates: [], anchorDate, today })).toBe(
      today,
    );
    expect(currentTowerPeriod({ cadence: "weekly", customDates: [], anchorDate, today })).toBe(
      "2026-10-19",
    );
    expect(currentTowerPeriod({ cadence: "biweekly", customDates: [], anchorDate, today })).toBe(
      "2026-10-19",
    );
    expect(currentTowerPeriod({ cadence: "monthly", customDates: [], anchorDate, today })).toBe(
      "2026-10-01",
    );
    expect(currentTowerPeriod({ cadence: "quarterly", customDates: [], anchorDate, today })).toBe(
      "2026-10-01",
    );
    expect(currentTowerPeriod({ cadence: "annually", customDates: [], anchorDate, today })).toBe(
      "2026-01-01",
    );
    expect(
      currentTowerPeriod({
        cadence: "custom",
        customDates: ["2026-10-23"],
        anchorDate,
        today,
      }),
    ).toBe(today);
    expect(
      currentTowerPeriod({
        cadence: "custom",
        customDates: ["2026-01-01"],
        anchorDate,
        today,
      }),
    ).toBeNull();
    expect(
      currentTowerPeriod({ cadence: "weekly", customDates: [], anchorDate, today: "2026-10-18" }),
    ).toBe("2026-10-12");
    expect(nextSpecifiedDate(["2026-11-01", "2026-10-01"], today)).toBe("2026-11-01");
  });
});

describe("tower check-in submission", () => {
  it("collects an ongoing value and a final completion", () => {
    const parsed = parseTowerCheckInSubmission(
      metrics,
      [
        {
          metricId: metrics[0]?.id ?? "",
          skipped: false,
          numeric: "4",
          secondary: null,
          text: null,
          completion: null,
        },
        {
          metricId: metrics[1]?.id ?? "",
          skipped: false,
          numeric: null,
          secondary: null,
          text: null,
          completion: "complete",
        },
      ],
      ["40000000-0000-4000-8000-000000000099"],
      ["40000000-0000-4000-8000-000000000099"],
    );
    expect(parsed.responses[0]?.numericValue).toBe(4);
    expect(parsed.responses[1]?.completion).toBe("complete");
    const summary = summarizeCheckIn(
      parsed.readings.map((item) => ({ label: item.label, reading: item.reading })),
      ["Evening cue"],
    );
    expect(summary.title).toBe("Check-in saved.");
    expect(summary.details).toEqual([
      "How it feels · 4 of 5",
      "Goal complete · Complete",
      "Protocols marked: Evening cue.",
    ]);
  });

  it("allows skipping an ongoing measure and rejects a skipped final", () => {
    const skipped = parseTowerCheckInSubmission(
      metrics,
      [
        {
          metricId: metrics[0]?.id ?? "",
          skipped: true,
          numeric: null,
          secondary: null,
          text: null,
          completion: null,
        },
        {
          metricId: metrics[1]?.id ?? "",
          skipped: false,
          numeric: null,
          secondary: null,
          text: null,
          completion: "incomplete",
        },
      ],
      [],
      [],
    );
    expect(skipped.responses[0]?.skipped).toBe(true);
    expect(() =>
      parseTowerCheckInSubmission(
        metrics,
        [
          {
            metricId: metrics[0]?.id ?? "",
            skipped: false,
            numeric: "3",
            secondary: null,
            text: null,
            completion: null,
          },
          {
            metricId: metrics[1]?.id ?? "",
            skipped: true,
            numeric: null,
            secondary: null,
            text: null,
            completion: null,
          },
        ],
        [],
        [],
      ),
    ).toThrow();
  });
});
