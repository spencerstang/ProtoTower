import { maximumMetricsPerTower, metricPresetByKey } from "@protostack/outcomes-engine";

export function clipPlainLine(value: string, maximum = 280): string {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const characters = Array.from(normalized);
  if (characters.length <= maximum) return normalized;
  return `${characters
    .slice(0, maximum - 3)
    .join("")
    .trimEnd()}...`;
}

function formStrings(formData: FormData, name: string): string[] {
  return formData.getAll(name).flatMap((value) => (typeof value === "string" ? [value] : []));
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export const customMeasureSlots = Array.from(
  { length: maximumMetricsPerTower },
  (_, index) => index + 1,
);
export const customProtocolSlots = [1, 2, 3] as const;

export type SetupProtocolChoice = Readonly<{
  id: string;
  version: number;
  title: string;
  howTo: string;
}>;

export function configuredTowerInputFromForm(
  formData: FormData,
  starters: readonly SetupProtocolChoice[],
): unknown {
  const protocols: {
    title: string;
    howTo: string;
    personalNote?: string | null;
    sourceProtocolId: string | null;
    sourceProtocolVersion: number | null;
  }[] = [];

  for (const starter of formStrings(formData, "starter")) {
    const protocol = starters.find((choice) => `${choice.id}@${choice.version}` === starter);
    protocols.push({
      title: protocol?.title ?? "",
      howTo: protocol?.howTo ?? "",
      sourceProtocolId: protocol?.id ?? null,
      sourceProtocolVersion: protocol?.version ?? null,
      personalNote: protocol ? formValue(formData, `starterNote.${protocol.id}`) : null,
    });
  }

  for (const slot of customProtocolSlots) {
    const title = formValue(formData, `customTitle${slot}`);
    const howTo = formValue(formData, `customHowTo${slot}`);
    if (title.trim() === "" && howTo.trim() === "") continue;
    protocols.push({
      title,
      howTo,
      sourceProtocolId: null,
      sourceProtocolVersion: null,
    });
  }

  const metrics: {
    kind: string;
    shape: string;
    label: string;
    presetKey: string | null;
    unit?: string | null;
  }[] = [];

  for (const key of formStrings(formData, "preset")) {
    const preset = metricPresetByKey(key);
    const label = formValue(formData, `presetLabel.${key}`);
    metrics.push(
      preset
        ? {
            kind: preset.kind,
            shape: preset.shape,
            label: label.trim() === "" ? preset.label : label,
            presetKey: preset.key,
          }
        : { kind: "ongoing", shape: "weight", label: key, presetKey: key },
    );
  }

  for (const slot of customMeasureSlots) {
    const encoded = formValue(formData, `customMetricShape${slot}`);
    const label = formValue(formData, `customMetricLabel${slot}`);
    const unit = formValue(formData, `customMetricUnit${slot}`);
    if (!encoded.trim() && !label.trim() && !unit.trim()) continue;
    const separator = encoded.indexOf(":");
    metrics.push({
      kind:
        separator > 0
          ? encoded.slice(0, separator)
          : formValue(formData, `customMetricKind${slot}`) || "final",
      shape: separator > 0 ? encoded.slice(separator + 1) : encoded,
      unit: unit || null,
      label,
      presetKey: null,
    });
  }

  return {
    title: formValue(formData, "title"),
    definition: formValue(formData, "definition"),
    cadence: formValue(formData, "cadence"),
    customDates: formStrings(formData, "customDate").filter((date) => date !== ""),
    audience: formValue(formData, "audience"),
    identity: formValue(formData, "identity") || "named",
    protocols,
    metrics,
  };
}
