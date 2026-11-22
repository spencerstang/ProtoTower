import {
  interpretCreateForm,
  parseTowerTitle,
  type TowerSetupDraft,
} from "@protostack/tower-engine";
import {
  assertPlainLine,
  maximumMetricsPerTower,
  metricKindSchema,
  metricPresetByKey,
  shapesForKind,
} from "@protostack/outcomes-engine";
import {
  configuredTowerInputFromForm,
  customMeasureSlots,
  customProtocolSlots,
  type SetupProtocolChoice,
} from "./tower-setup-form";

export type SetupFieldError = Readonly<{ field: string; message: string }>;
export type SetupActionState = Readonly<{ errors: readonly SetupFieldError[] }>;
export type SetupAction = (formData: FormData) => Promise<SetupActionState>;
export const setupFailure = (message: string, field = "setup-name"): SetupActionState => ({
  errors: [{ field, message }],
});

function value(data: FormData, name: string): string {
  const entry = data.get(name);
  return typeof entry === "string" ? entry : "";
}

export function validateSetupForm(
  data: FormData,
  starters: readonly SetupProtocolChoice[],
):
  | Readonly<{ ok: true; title: ReturnType<typeof parseTowerTitle>; draft: TowerSetupDraft }>
  | Readonly<{ ok: false; errors: readonly SetupFieldError[] }> {
  const errors: SetupFieldError[] = [];
  const line = (name: string, id: string, label: string, maximum: number, optional = false) => {
    const text = value(data, name);
    if (optional && text.trim() === "") return;
    try {
      assertPlainLine(text, maximum);
    } catch {
      errors.push({
        field: id,
        message: `${label}: use plain text between 1 and ${maximum} characters.`,
      });
    }
  };
  line("title", "title", "Goal", 80);
  line("definition", "definition", "Definition", 160, true);
  const titles = new Set<string>();
  const checkProtocol = (name: string, id: string, howName: string, howId: string) => {
    line(name, id, "Protocol name", 80);
    line(howName, howId, "Protocol instructions", 280);
    const title = value(data, name).trim().toLocaleLowerCase("en-US");
    if (titles.has(title))
      errors.push({ field: id, message: "Give each protocol a different name." });
    titles.add(title);
  };
  for (const entry of data.getAll("starter")) {
    const starter = starters.find((item) => `${item.id}@${item.version}` === entry);
    if (!starter) {
      errors.push({
        field: "setup-protocols",
        message: "Choose a published protocol from this list.",
      });
      continue;
    }
    titles.add(starter.title.toLocaleLowerCase("en-US"));
    line(`starterNote.${starter.id}`, `starter-note-${starter.id}`, "My version note", 280, true);
  }
  for (const slot of customProtocolSlots) {
    if (value(data, `customTitle${slot}`).trim() || value(data, `customHowTo${slot}`).trim()) {
      const suffix = slot === 1 ? "" : `-${slot}`;
      checkProtocol(
        `customTitle${slot}`,
        `custom-protocol-name${suffix}`,
        `customHowTo${slot}`,
        `custom-how-to${suffix}`,
      );
    }
  }
  const presetEntries = data.getAll("preset");
  for (const key of presetEntries) {
    if (typeof key !== "string" || !metricPresetByKey(key)) {
      errors.push({ field: "setup-outcomes", message: "Choose a measure from the preset list." });
      continue;
    }
    line(`presetLabel.${key}`, `preset-label-${key}`, "Measure name", 80, true);
  }
  let measureCount = presetEntries.length;
  for (const slot of customMeasureSlots) {
    const label = value(data, `customMetricLabel${slot}`);
    const encoded = value(data, `customMetricShape${slot}`);
    const unit = value(data, `customMetricUnit${slot}`);
    if (!label.trim() && !encoded.trim() && !unit.trim()) continue;
    measureCount += 1;
    line(`customMetricLabel${slot}`, `custom-metric-name-${slot}`, "Measure name", 80);
    if (!encoded)
      errors.push({
        field: `custom-metric-shape-${slot}`,
        message: "Choose what to record for this measure.",
      });
    const separator = encoded.indexOf(":");
    const kind = metricKindSchema.safeParse(
      separator > 0
        ? encoded.slice(0, separator)
        : value(data, `customMetricKind${slot}`) || "final",
    );
    const shape = separator > 0 ? encoded.slice(separator + 1) : encoded;
    if (encoded && (!kind.success || !shapesForKind(kind.data).some((item) => item === shape))) {
      errors.push({
        field: `custom-metric-shape-${slot}`,
        message: "Choose a response type supported by this measure's role.",
      });
    }
    line(`customMetricUnit${slot}`, `custom-metric-unit-${slot}`, "Unit", 24, true);
    if (unit.trim() && shape !== "number")
      errors.push({
        field: `custom-metric-unit-${slot}`,
        message: "Units can be added to a Number measure.",
      });
  }
  if (measureCount > maximumMetricsPerTower) {
    errors.push({
      field: "setup-outcomes",
      message: `Choose up to ${maximumMetricsPerTower} measures.`,
    });
  }
  if (errors.length) return { ok: false, errors };
  try {
    const title = parseTowerTitle(value(data, "title"));
    const result = interpretCreateForm(configuredTowerInputFromForm(data, starters));
    if (result.ok) return { ok: true, title, draft: result.draft };
    const messages = {
      protocols: {
        field: "setup-protocols",
        message: "Choose between one and three protocols to start.",
      },
      final: {
        field: "setup-outcomes",
        message:
          "Choose at least one outcome measure, or add a custom measure with the Outcome role.",
      },
      dates: {
        field: "setup-rhythm",
        message:
          "Specific dates must be valid, distinct dates and are used only with the Specific dates rhythm.",
      },
      invalid: {
        field: "setup-outcomes",
        message:
          "Check measure names for duplicates and choose a response type for every custom measure.",
      },
    } as const;
    return { ok: false, errors: [messages[result.code]] };
  } catch {
    return {
      ok: false,
      errors: [
        {
          field: "setup-name",
          message:
            "Review the goal, protocol instructions, and measure names. Your responses have been kept.",
        },
      ],
    };
  }
}
