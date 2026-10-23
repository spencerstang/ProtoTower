import { metricPresetByKey } from "@protostack/outcomes-engine";

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

export function configuredTowerInputFromForm(formData: FormData): unknown {
  const protocols: {
    title: string;
    howTo: string;
    sourceProtocolId: string | null;
    sourceProtocolVersion: number | null;
  }[] = [];

  for (const starter of formStrings(formData, "starter")) {
    const separator = starter.lastIndexOf("@");
    if (separator <= 0) {
      protocols.push({
        title: "",
        howTo: "",
        sourceProtocolId: null,
        sourceProtocolVersion: null,
      });
      continue;
    }
    const sourceProtocolId = starter.slice(0, separator);
    const sourceProtocolVersion = Number(starter.slice(separator + 1));
    protocols.push({
      title: formValue(formData, `starterTitle.${sourceProtocolId}`),
      howTo: formValue(formData, `starterHowTo.${sourceProtocolId}`),
      sourceProtocolId,
      sourceProtocolVersion,
    });
  }

  for (const slot of [1, 2, 3]) {
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

  for (const slot of [1, 2]) {
    const encoded = formValue(formData, `customMetricShape${slot}`);
    const label = formValue(formData, `customMetricLabel${slot}`);
    if (encoded.trim() === "" && label.trim() === "") continue;
    const separator = encoded.indexOf(":");
    metrics.push({
      kind: separator > 0 ? encoded.slice(0, separator) : encoded,
      shape: separator > 0 ? encoded.slice(separator + 1) : "",
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
