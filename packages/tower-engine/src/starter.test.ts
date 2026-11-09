import { describe, expect, it } from "vitest";
import { matchStarterIntent, parseAdherenceStatus, parseStarterOutcomeNote } from "./starter";

function matchKey(input: string): string {
  const matched = matchStarterIntent(input);
  if (!matched.ok) throw new Error("expected a starter match");
  return matched.matchKey;
}

describe("starter intent matching", () => {
  it("pairs sleep language with the sleep key", () => {
    expect(matchStarterIntent("Sleep better")).toEqual({
      ok: true,
      intent: "Sleep better",
      matchKey: "sleep",
    });
    expect(matchKey("  less caffeine at night ")).toBe("sleep");
  });

  it("leaves the second protocol unselected for training-only language", () => {
    expect(matchStarterIntent("Work out 3x/week")).toEqual({
      ok: true,
      intent: "Work out 3x/week",
      matchKey: "training",
    });
    expect(matchKey("strength and zone 2")).toBe("training");
  });

  it("adds heat only when a training sentence also mentions heat or sauna", () => {
    expect(matchKey("Work out, then sauna")).toBe("training-heat");
    expect(matchKey("train in the heat")).toBe("training-heat");
    expect(matchKey("sauna twice a week")).toBe("unmatched");
  });

  it("creates an unmatched tower without inventing a pair", () => {
    expect(matchStarterIntent("Save for a kitchen renovation")).toEqual({
      ok: true,
      intent: "Save for a kitchen renovation",
      matchKey: "unmatched",
    });
  });

  it("prefers sleep when a sentence mentions both sleep and training", () => {
    expect(matchKey("Sleep better and work out")).toBe("sleep");
  });

  it("rejects blank and unsafe text", () => {
    expect(matchStarterIntent("   ")).toEqual({ ok: false });
    expect(matchStarterIntent("Sleep\nbefore midnight")).toEqual({ ok: false });
    expect(matchStarterIntent(`${"a".repeat(161)}`)).toEqual({ ok: false });
  });
});

describe("starter check-in parsing", () => {
  it("accepts the three adherence states", () => {
    expect(parseAdherenceStatus("done")).toBe("done");
    expect(parseAdherenceStatus("not_this_period")).toBe("not_this_period");
    expect(parseAdherenceStatus("skipped")).toBe("skipped");
    expect(parseAdherenceStatus("completed")).toBeNull();
  });

  it("treats a blank outcome as a skip and rejects a control character", () => {
    expect(parseStarterOutcomeNote("  ")).toEqual({ skipped: true, text: null });
    expect(parseStarterOutcomeNote("Woke near the usual time")).toEqual({
      skipped: false,
      text: "Woke near the usual time",
    });
    expect(parseStarterOutcomeNote("note\u0000")).toBeNull();
  });
});
