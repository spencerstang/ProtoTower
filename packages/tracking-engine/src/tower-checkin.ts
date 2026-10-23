import {
  calmCheckInSummary,
  metricReadingLine,
  parseMetricSubmission,
  readingPayload,
  type MetricKind,
  type MetricReading,
  type MetricShape,
} from "@protostack/outcomes-engine";
import { type TowerCadence } from "@protostack/tower-engine";

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

function assertCalendarDate(value: string): string {
  if (!calendarDatePattern.test(value)) throw new Error("Calendar date is invalid.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Calendar date is invalid.");
  }
  return value;
}

function addUtcDays(isoDate: string, days: number): string {
  const parsed = new Date(`${assertCalendarDate(isoDate)}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function diffUtcDays(from: string, to: string): number {
  const start = new Date(`${assertCalendarDate(from)}T00:00:00.000Z`).getTime();
  const end = new Date(`${assertCalendarDate(to)}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function mondayOf(isoDate: string): string {
  const parsed = new Date(`${assertCalendarDate(isoDate)}T00:00:00.000Z`);
  const day = parsed.getUTCDay();
  const delta = day === 0 ? 6 : day - 1;
  return addUtcDays(isoDate, -delta);
}

export function utcCalendarDate(instant: Date): string {
  if (Number.isNaN(instant.getTime())) throw new Error("Instant is invalid.");
  return instant.toISOString().slice(0, 10);
}

/**
 * Period start for a tower cadence. Keep this aligned with
 * app_private.tower_period_start, which uses UTC dates and PostgreSQL
 * date_trunc week/month/quarter/year.
 */
export function currentTowerPeriod(input: {
  cadence: TowerCadence;
  customDates: readonly string[];
  anchorDate: string;
  today: string;
}): string | null {
  const today = assertCalendarDate(input.today);
  const anchorDate = assertCalendarDate(input.anchorDate);
  for (const date of input.customDates) assertCalendarDate(date);

  switch (input.cadence) {
    case "daily":
      return today;
    case "weekly":
      return mondayOf(today);
    case "biweekly": {
      const anchorMonday = mondayOf(anchorDate);
      const elapsed = diffUtcDays(anchorMonday, today);
      const periods = Math.floor(elapsed / 14);
      return addUtcDays(anchorMonday, periods * 14);
    }
    case "monthly":
      return `${today.slice(0, 7)}-01`;
    case "quarterly": {
      const month = Number(today.slice(5, 7));
      const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;
      return `${today.slice(0, 4)}-${String(quarterMonth).padStart(2, "0")}-01`;
    }
    case "annually":
      return `${today.slice(0, 4)}-01-01`;
    case "custom":
      return input.customDates.includes(today) ? today : null;
    default: {
      const unexpected: never = input.cadence;
      throw new Error(`Cadence is invalid: ${unexpected}`);
    }
  }
}

export function nextSpecifiedDate(dates: readonly string[], today: string): string | null {
  const current = assertCalendarDate(today);
  return (
    dates
      .map((date) => assertCalendarDate(date))
      .filter((date) => date > current)
      .sort()[0] ?? null
  );
}

export type TowerCheckInMetric = Readonly<{
  id: string;
  kind: MetricKind;
  shape: MetricShape;
  label: string;
}>;

export type TowerCheckInResponse = Readonly<{
  metricId: string;
  skipped: boolean;
  numericValue: number | null;
  secondaryNumeric: number | null;
  textValue: string | null;
  completion: "complete" | "incomplete" | null;
}>;

export function parseTowerCheckInSubmission(
  metrics: readonly TowerCheckInMetric[],
  submissions: readonly {
    metricId: string;
    skipped: boolean;
    numeric: string | null;
    secondary: string | null;
    text: string | null;
    completion: string | null;
  }[],
  markedProtocolIds: readonly string[],
  knownProtocolIds: readonly string[],
): Readonly<{
  responses: readonly TowerCheckInResponse[];
  markedProtocolIds: readonly string[];
  readings: readonly { metricId: string; label: string; reading: MetricReading }[];
}> {
  if (metrics.length === 0 || submissions.length !== metrics.length) {
    throw new Error("Check-in metrics are incomplete.");
  }
  const metricIds = new Set<string>();
  const responses: TowerCheckInResponse[] = [];
  const readings: { metricId: string; label: string; reading: MetricReading }[] = [];

  for (const submission of submissions) {
    const metric = metrics.find((item) => item.id === submission.metricId);
    if (!metric || metricIds.has(metric.id)) throw new Error("Check-in metric is invalid.");
    metricIds.add(metric.id);
    const reading = parseMetricSubmission(metric, submission);
    const payload = readingPayload(reading);
    responses.push({ metricId: metric.id, ...payload });
    readings.push({ metricId: metric.id, label: metric.label, reading });
  }

  if (metricIds.size !== metrics.length) throw new Error("Check-in metrics are incomplete.");

  const known = new Set(knownProtocolIds);
  const marked = new Set<string>();
  for (const protocolId of markedProtocolIds) {
    if (!known.has(protocolId) || marked.has(protocolId)) {
      throw new Error("Protocol mark is invalid.");
    }
    marked.add(protocolId);
  }

  return { responses, markedProtocolIds: [...marked], readings };
}

export function summarizeCheckIn(
  readings: readonly { label: string; reading: MetricReading }[],
  markedProtocolTitles: readonly string[],
): ReturnType<typeof calmCheckInSummary> {
  const lines = readings.flatMap((item) => {
    const line = metricReadingLine(item.label, item.reading);
    return line ? [line] : [];
  });
  return calmCheckInSummary(lines, markedProtocolTitles);
}
