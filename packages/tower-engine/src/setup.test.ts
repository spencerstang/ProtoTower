import { describe, expect, it } from "vitest";
import { parsePersonalTower } from "./index";
import {
  addMetricToDraft,
  addProtocolToDraft,
  commitTowerSetup,
  firstTowerProtocolLimit,
  identityChoiceVisible,
  interpretCreateForm,
  presetMetric,
  removeMetricFromDraft,
  replaceVisibility,
  visibilityLabel,
} from "./setup";

const protocol = {
  title: "Evening cue",
  howTo: "Dim one lamp.",
  sourceProtocolId: null,
  sourceProtocolVersion: null,
};

const finalMetric = {
  kind: "final",
  shape: "complete_incomplete",
  label: "Goal complete",
  presetKey: "goal-complete",
};

const base = {
  definition: "",
  cadence: "weekly",
  customDates: [],
  audience: "private",
  identity: "anonymous",
  protocols: [protocol],
  metrics: [finalMetric],
};

describe("tower setup", () => {
  it("accepts the happy path and keeps a private tower named", () => {
    const result = interpretCreateForm(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.identity).toBe("named");
    expect(result.draft.definition).toBeNull();
    expect(result.draft.cadence).toBe("weekly");
    expect(identityChoiceVisible("private")).toBe(false);
    expect(identityChoiceVisible("shared")).toBe(true);
    expect(visibilityLabel("private", "named")).toBe("Private");
    expect(visibilityLabel("shared", "anonymous")).toBe("Shared · Anonymous");
  });

  it("requires one to three protocols and a final on the first tower", () => {
    expect(interpretCreateForm({ ...base, protocols: [] })).toEqual({
      ok: false,
      code: "protocols",
    });
    const missingFinal = interpretCreateForm({ ...base, metrics: [] });
    expect(missingFinal).toEqual({ ok: false, code: "final" });
    const tooMany = interpretCreateForm({
      ...base,
      protocols: Array.from({ length: firstTowerProtocolLimit + 1 }, (_, index) => ({
        ...protocol,
        title: `Protocol ${index + 1}`,
      })),
    });
    expect(tooMany).toEqual({ ok: false, code: "protocols" });
  });

  it("adds ongoing and proxy presets plus a custom metric", () => {
    const ongoing = presetMetric("weight", "Morning weight");
    const proxy = presetMetric("sleep-hours", "");
    const custom = {
      kind: "proxy",
      shape: "count",
      label: "Pages read",
      presetKey: null,
    };
    expect(ongoing?.label).toBe("Morning weight");
    expect(proxy?.label).toBe("Sleep hours");
    const result = interpretCreateForm({
      ...base,
      metrics: [finalMetric, ongoing, proxy, custom],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.metrics.map((metric) => metric.kind)).toEqual([
      "final",
      "ongoing",
      "proxy",
      "proxy",
    ]);
  });

  it("keeps a shared anonymous choice and rejects a preset mismatch", () => {
    const shared = replaceVisibility(
      {
        definition: null,
        cadence: "weekly",
        customDates: [],
        audience: "private",
        identity: "named",
        protocols: [{ ...protocol, title: "Evening cue", howTo: "Dim one lamp." }],
        metrics: [
          {
            kind: "final",
            shape: "complete_incomplete",
            label: "Goal complete",
            presetKey: "goal-complete",
          },
        ],
      },
      "shared",
      "anonymous",
    );
    expect(shared.ok).toBe(true);
    if (!shared.ok) return;
    expect(shared.draft.identity).toBe("anonymous");
    expect(
      commitTowerSetup(
        {
          ...base,
          identity: "named",
          metrics: [{ ...finalMetric, shape: "weight", kind: "final" }],
        },
        3,
      ).ok,
    ).toBe(false);
  });

  it("edits protocols after creation without dropping the last final", () => {
    const created = interpretCreateForm(base);
    if (!created.ok) throw new Error("setup failed");
    const withId = {
      ...created.draft,
      protocols: created.draft.protocols.map((item) => ({
        ...item,
        id: "40000000-0000-4000-8000-000000000001",
      })),
      metrics: created.draft.metrics.map((item) => ({
        ...item,
        id: "40000000-0000-4000-8000-000000000002",
      })),
    };
    const added = addProtocolToDraft(withId, {
      title: "Custom walk",
      howTo: "Walk one block.",
      sourceProtocolId: null,
      sourceProtocolVersion: null,
    });
    expect(added.ok).toBe(true);
    const removedFinal = removeMetricFromDraft(withId, "40000000-0000-4000-8000-000000000002");
    expect(removedFinal).toEqual({ ok: false, code: "final" });
    const weight = presetMetric("feeling", "");
    if (!weight) throw new Error("preset missing");
    const withOngoing = addMetricToDraft(withId, weight);
    expect(withOngoing.ok).toBe(true);
  });

  it("still parses a legacy tower that has no setup", () => {
    const tower = parsePersonalTower({
      id: "20000000-0000-4000-8000-000000000001",
      title: "Sleep better",
      revision: 0,
      items: [],
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    });
    expect(tower.cadence).toBe("weekly");
    expect(tower.audience).toBe("private");
    expect(tower.identity).toBe("named");
    expect(tower.protocols).toEqual([]);
    expect(tower.metrics).toEqual([]);
    expect(tower.definition).toBeNull();
  });
});
