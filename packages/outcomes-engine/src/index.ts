import { z } from "zod";

export const maximumMetricsPerTower = 12;

const forbiddenLineCharacters = /[\p{Cc}\p{Cf}]/u;

export const metricKindSchema = z.enum(["ongoing", "proxy", "final"]);
export type MetricKind = z.infer<typeof metricKindSchema>;

export const metricShapeSchema = z.enum([
  "weight",
  "rating",
  "blood_pressure",
  "qualitative",
  "count",
  "hours",
  "scale_1_5",
  "complete_incomplete",
  "percent",
]);
export type MetricShape = z.infer<typeof metricShapeSchema>;

export const metricPresets = [
  { key: "weight", kind: "ongoing", shape: "weight", label: "Weight" },
  { key: "feeling", kind: "ongoing", shape: "rating", label: "How it feels" },
  { key: "blood-pressure", kind: "ongoing", shape: "blood_pressure", label: "Blood pressure" },
  { key: "note", kind: "ongoing", shape: "qualitative", label: "How it's going" },
  { key: "workouts", kind: "proxy", shape: "count", label: "Workouts logged" },
  { key: "sleep-hours", kind: "proxy", shape: "hours", label: "Sleep hours" },
  { key: "outreach", kind: "proxy", shape: "count", label: "Outreach count" },
  { key: "goal-complete", kind: "final", shape: "complete_incomplete", label: "Goal complete" },
  { key: "success-rating", kind: "final", shape: "scale_1_5", label: "Success rating" },
  { key: "percent-successful", kind: "final", shape: "percent", label: "Percent successful" },
] as const;

export type MetricPreset = (typeof metricPresets)[number];
export type MetricPresetKey = MetricPreset["key"];

export const metricPresetKeySchema = z.enum([
  "weight",
  "feeling",
  "blood-pressure",
  "note",
  "workouts",
  "sleep-hours",
  "outreach",
  "goal-complete",
  "success-rating",
  "percent-successful",
]);

const shapesByKind: Record<MetricKind, readonly MetricShape[]> = {
  ongoing: ["weight", "rating", "blood_pressure", "qualitative"],
  proxy: ["count", "hours", "rating"],
  final: ["scale_1_5", "complete_incomplete", "percent"],
};

export function shapesForKind(kind: MetricKind): readonly MetricShape[] {
  return shapesByKind[kind];
}

export function metricPresetByKey(key: string): MetricPreset | null {
  return metricPresets.find((preset) => preset.key === key) ?? null;
}

export function metricPresetMatches(
  key: MetricPresetKey,
  kind: MetricKind,
  shape: MetricShape,
): boolean {
  const preset = metricPresetByKey(key);
  return preset !== null && preset.kind === kind && preset.shape === shape;
}

export function assertPlainLine(value: string, maximum: number): string {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 1 || length > maximum || forbiddenLineCharacters.test(normalized)) {
    throw new Error("Text is invalid.");
  }
  return normalized;
}

export function parseOptionalPlainLine(input: unknown, maximum: number): string | null {
  if (input === null) return null;
  if (typeof input !== "string") throw new Error("Text is invalid.");
  const normalized = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (normalized.length === 0) return null;
  return assertPlainLine(normalized, maximum);
}

const metricLabelSchema = z.string().transform((value) => assertPlainLine(value, 80));

export const metricDraftSchema = z
  .object({
    id: z.uuid().optional(),
    kind: metricKindSchema,
    shape: metricShapeSchema,
    label: metricLabelSchema,
    presetKey: metricPresetKeySchema.nullable(),
  })
  .strict()
  .superRefine((metric, context) => {
    if (!shapesForKind(metric.kind).includes(metric.shape)) {
      context.addIssue({
        code: "custom",
        path: ["shape"],
        message: "Metric shape does not match its type.",
      });
    }
    if (
      metric.presetKey !== null &&
      !metricPresetMatches(metric.presetKey, metric.kind, metric.shape)
    ) {
      context.addIssue({
        code: "custom",
        path: ["presetKey"],
        message: "Metric preset does not match its type.",
      });
    }
  });
export type MetricDraft = Readonly<z.infer<typeof metricDraftSchema>>;

export const storedMetricSchema = metricDraftSchema
  .safeExtend({
    id: z.uuid(),
    position: z.int().min(1).max(maximumMetricsPerTower),
  })
  .strict();
export type StoredMetric = Readonly<z.infer<typeof storedMetricSchema>>;

export type MetricReading =
  | Readonly<{ skipped: true }>
  | Readonly<{ skipped: false; shape: "weight"; numeric: number }>
  | Readonly<{ skipped: false; shape: "rating"; numeric: number }>
  | Readonly<{ skipped: false; shape: "scale_1_5"; numeric: number }>
  | Readonly<{ skipped: false; shape: "blood_pressure"; systolic: number; diastolic: number }>
  | Readonly<{ skipped: false; shape: "qualitative"; text: string }>
  | Readonly<{ skipped: false; shape: "count"; numeric: number }>
  | Readonly<{ skipped: false; shape: "hours"; numeric: number }>
  | Readonly<{ skipped: false; shape: "percent"; numeric: number }>
  | Readonly<{
      skipped: false;
      shape: "complete_incomplete";
      completion: "complete" | "incomplete";
    }>;

export type MetricSubmission = Readonly<{
  skipped: boolean;
  numeric: string | null;
  secondary: string | null;
  text: string | null;
  completion: string | null;
}>;

function decimalNumber(
  input: string | null,
  maximumDecimals: number,
  minimum: number,
  maximum: number,
): number {
  if (input === null) throw new Error("Number is invalid.");
  const trimmed = input.trim();
  const pattern = maximumDecimals === 0 ? /^\d+$/u : /^\d+(?:\.\d+)?$/u;
  if (!pattern.test(trimmed)) throw new Error("Number is invalid.");
  const fraction = trimmed.split(".")[1];
  if (fraction && fraction.length > maximumDecimals) throw new Error("Number is invalid.");
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error("Number is invalid.");
  }
  return value;
}

function blank(value: string | null): boolean {
  return value === null || value.trim() === "";
}

function assertBlank(value: string | null): void {
  if (!blank(value)) throw new Error("Metric submission is invalid.");
}

function emptyMeasurement(submission: MetricSubmission): boolean {
  return (
    blank(submission.numeric) &&
    blank(submission.secondary) &&
    blank(submission.text) &&
    blank(submission.completion)
  );
}

export function parseMetricSubmission(
  metric: Readonly<{ kind: MetricKind; shape: MetricShape }>,
  submission: MetricSubmission,
): MetricReading {
  if (submission.skipped) {
    if (metric.kind === "final" || !emptyMeasurement(submission)) {
      throw new Error("Metric submission is invalid.");
    }
    return { skipped: true };
  }

  switch (metric.shape) {
    case "weight":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "weight",
        numeric: decimalNumber(submission.numeric, 2, 0.01, 1000),
      };
    case "rating":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "rating",
        numeric: decimalNumber(submission.numeric, 0, 1, 5),
      };
    case "scale_1_5":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "scale_1_5",
        numeric: decimalNumber(submission.numeric, 0, 1, 5),
      };
    case "percent":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "percent",
        numeric: decimalNumber(submission.numeric, 0, 0, 100),
      };
    case "count":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "count",
        numeric: decimalNumber(submission.numeric, 0, 0, 10_000),
      };
    case "hours":
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      assertBlank(submission.completion);
      return {
        skipped: false,
        shape: "hours",
        numeric: decimalNumber(submission.numeric, 2, 0, 24),
      };
    case "blood_pressure": {
      assertBlank(submission.text);
      assertBlank(submission.completion);
      const systolic = decimalNumber(submission.numeric, 0, 70, 250);
      const diastolic = decimalNumber(submission.secondary, 0, 40, 150);
      if (systolic <= diastolic) throw new Error("Blood pressure is invalid.");
      return { skipped: false, shape: "blood_pressure", systolic, diastolic };
    }
    case "qualitative": {
      assertBlank(submission.numeric);
      assertBlank(submission.secondary);
      assertBlank(submission.completion);
      if (submission.text === null) throw new Error("Note is invalid.");
      return { skipped: false, shape: "qualitative", text: assertPlainLine(submission.text, 280) };
    }
    case "complete_incomplete": {
      assertBlank(submission.numeric);
      assertBlank(submission.secondary);
      assertBlank(submission.text);
      if (submission.completion !== "complete" && submission.completion !== "incomplete") {
        throw new Error("Completion is invalid.");
      }
      return { skipped: false, shape: "complete_incomplete", completion: submission.completion };
    }
    default: {
      const unexpected: never = metric.shape;
      throw new Error(`Metric shape is invalid: ${unexpected}`);
    }
  }
}

export function formatMetricReading(reading: MetricReading): string | null {
  if (reading.skipped) return null;
  switch (reading.shape) {
    case "weight":
    case "count":
      return String(reading.numeric);
    case "hours":
      return String(reading.numeric);
    case "rating":
    case "scale_1_5":
      return `${reading.numeric} of 5`;
    case "percent":
      return `${reading.numeric}%`;
    case "blood_pressure":
      return `${reading.systolic}/${reading.diastolic}`;
    case "qualitative":
      return reading.text;
    case "complete_incomplete":
      return reading.completion === "complete" ? "Complete" : "Incomplete";
    default: {
      const unexpected: never = reading;
      return unexpected;
    }
  }
}

export function metricReadingLine(label: string, reading: MetricReading): string | null {
  const formatted = formatMetricReading(reading);
  if (formatted === null) return null;
  return `${label} · ${formatted}`;
}

export function calmCheckInSummary(
  lines: readonly string[],
  markedProtocolTitles: readonly string[],
): Readonly<{ title: string; details: readonly string[]; closing: string }> {
  const protocolLine =
    markedProtocolTitles.length === 0
      ? null
      : `Protocols marked: ${markedProtocolTitles.join(", ")}.`;
  return {
    title: "Check-in saved.",
    details: [...lines, ...(protocolLine ? [protocolLine] : [])],
    closing: "This is a private record of the period.",
  };
}

export function readingPayload(reading: MetricReading): Readonly<{
  skipped: boolean;
  numericValue: number | null;
  secondaryNumeric: number | null;
  textValue: string | null;
  completion: "complete" | "incomplete" | null;
}> {
  if (reading.skipped) {
    return {
      skipped: true,
      numericValue: null,
      secondaryNumeric: null,
      textValue: null,
      completion: null,
    };
  }
  switch (reading.shape) {
    case "weight":
    case "rating":
    case "scale_1_5":
    case "count":
    case "hours":
    case "percent":
      return {
        skipped: false,
        numericValue: reading.numeric,
        secondaryNumeric: null,
        textValue: null,
        completion: null,
      };
    case "blood_pressure":
      return {
        skipped: false,
        numericValue: reading.systolic,
        secondaryNumeric: reading.diastolic,
        textValue: null,
        completion: null,
      };
    case "qualitative":
      return {
        skipped: false,
        numericValue: null,
        secondaryNumeric: null,
        textValue: reading.text,
        completion: null,
      };
    case "complete_incomplete":
      return {
        skipped: false,
        numericValue: null,
        secondaryNumeric: null,
        textValue: null,
        completion: reading.completion,
      };
    default: {
      const unexpected: never = reading;
      throw new Error(`Metric reading is invalid: ${JSON.stringify(unexpected)}`);
    }
  }
}

export function readingFromPayload(
  shape: MetricShape,
  payload: Readonly<{
    skipped: boolean;
    numericValue: number | null;
    secondaryNumeric: number | null;
    textValue: string | null;
    completion: "complete" | "incomplete" | null;
  }>,
): MetricReading {
  return parseMetricSubmission(
    {
      kind:
        shape === "scale_1_5" || shape === "complete_incomplete" || shape === "percent"
          ? "final"
          : shape === "count" || shape === "hours"
            ? "proxy"
            : "ongoing",
      shape,
    },
    {
      skipped: payload.skipped,
      numeric: payload.numericValue === null ? null : String(payload.numericValue),
      secondary: payload.secondaryNumeric === null ? null : String(payload.secondaryNumeric),
      text: payload.textValue,
      completion: payload.completion,
    },
  );
}

export const outcomesEngineStatus = "tower-outcome-metrics" as const;
