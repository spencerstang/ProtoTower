import { interpretCreateForm } from "@protostack/tower-engine";
import { describe, expect, it } from "vitest";
import { configuredTowerInputFromForm } from "./tower-setup-form";

function form(entries: readonly (readonly [string, string])[]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

const starters = [
  { id: "20000000-0000-4000-8000-000000000001", version: 1, title: "One", howTo: "Do one." },
  {
    id: "20000000-0000-4000-8000-000000000002",
    version: 1,
    title: "Published strength",
    howTo: "Published instructions.",
  },
];

describe("tower setup form", () => {
  it("builds a private weekly tower from a name, one protocol, and one final", () => {
    const interpreted = interpretCreateForm(
      configuredTowerInputFromForm(
        form([
          ["title", "Sleep better"],
          ["definition", ""],
          ["customTitle1", "Evening cue"],
          ["customHowTo1", "Dim one lamp."],
          ["preset", "goal-complete"],
          ["presetLabel.goal-complete", "Goal complete"],
          ["cadence", "weekly"],
          ["audience", "private"],
          ["identity", "anonymous"],
        ]),
        starters,
      ),
    );
    expect(interpreted.ok).toBe(true);
    if (!interpreted.ok) return;
    expect(interpreted.draft.identity).toBe("named");
    expect(interpreted.draft.cadence).toBe("weekly");
    expect(interpreted.draft.protocols).toHaveLength(1);
    expect(interpreted.draft.metrics.map((metric) => metric.kind)).toEqual(["final"]);
  });

  it("keeps the published definition, personal note, renamed preset, and three custom measures", () => {
    const interpreted = interpretCreateForm(
      configuredTowerInputFromForm(
        form([
          ["title", "Train"],
          ["starter", "20000000-0000-4000-8000-000000000002@1"],
          ["starterTitle.20000000-0000-4000-8000-000000000002", "Short strength"],
          ["starterNote.20000000-0000-4000-8000-000000000002", "Two comfortable sets."],
          ["preset", "goal-complete"],
          ["preset", "weight"],
          ["presetLabel.weight", "Morning weigh-in"],
          ["preset", "sleep-hours"],
          ["customMetricShape1", "proxy:count"],
          ["customMetricLabel1", "Pages read"],
          ["customMetricShape2", "ongoing:number"],
          ["customMetricLabel2", "Sample value"],
          ["customMetricShape3", "ongoing:text"],
          ["customMetricLabel3", "Sample note"],
          ["cadence", "weekly"],
          ["audience", "shared"],
          ["identity", "anonymous"],
        ]),
        starters,
      ),
    );
    expect(interpreted.ok).toBe(true);
    if (!interpreted.ok) return;
    expect(interpreted.draft.identity).toBe("anonymous");
    expect(interpreted.draft.protocols[0]).toMatchObject({
      title: "Published strength",
      howTo: "Published instructions.",
      personalNote: "Two comfortable sets.",
      sourceProtocolVersion: 1,
    });
    expect(interpreted.draft.metrics[1]?.label).toBe("Morning weigh-in");
    expect(interpreted.draft.metrics.map((metric) => metric.presetKey)).toEqual([
      "goal-complete",
      "weight",
      "sleep-hours",
      null,
      null,
      null,
    ]);
  });

  it("accepts two library and two custom protocols during initial setup", () => {
    const interpreted = interpretCreateForm(
      configuredTowerInputFromForm(
        form([
          ["title", "Mixed protocol goal"],
          ["starter", "20000000-0000-4000-8000-000000000001@1"],
          ["starter", "20000000-0000-4000-8000-000000000002@1"],
          ["starterNote.20000000-0000-4000-8000-000000000001", "Use my timing."],
          ["customTitle1", "Three"],
          ["customHowTo1", "Do three."],
          ["customTitle2", "Four"],
          ["customHowTo2", "Do four."],
          ["preset", "goal-complete"],
          ["cadence", "weekly"],
          ["audience", "private"],
          ["identity", "named"],
        ]),
        starters,
      ),
    );
    expect(interpreted.ok).toBe(true);
    if (!interpreted.ok) return;
    expect(interpreted.draft.protocols.map((protocol) => protocol.title)).toEqual([
      "One",
      "Published strength",
      "Three",
      "Four",
    ]);
    expect(interpreted.draft.protocols.map((protocol) => protocol.sourceProtocolId)).toEqual([
      starters[0]?.id,
      starters[1]?.id,
      null,
      null,
    ]);
    expect(interpreted.draft.protocols[0]?.personalNote).toBe("Use my timing.");
  });
});
