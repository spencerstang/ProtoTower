import { protocolIdSchema } from "@protostack/protocol-engine";
import { maximumItemsPerTower, towerIdSchema } from "@protostack/tower-engine";
import { z } from "zod";

export const practiceCorrectionWindowDays = 30;
export const practiceHistoryWindowDays = 30;
export const practiceUtcBoundaryAllowanceDays = 1;
export const maximumPracticeHistoryRows =
  maximumItemsPerTower * (practiceHistoryWindowDays + practiceUtcBoundaryAllowanceDays);

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

function isCalendarDate(value: string): boolean {
  if (!calendarDatePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftUtcDate(value: Date, days: number): string {
  const shifted = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days),
  );
  return shifted.toISOString().slice(0, 10);
}

function calendarDayNumber(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00.000Z`).getTime() / 86_400_000);
}

export const practiceDateSchema = z
  .string()
  .regex(calendarDatePattern, "Practice date must use YYYY-MM-DD.")
  .refine(isCalendarDate, "Practice date must be a real calendar date.")
  .brand<"PracticeDate">();
export type PracticeDate = z.infer<typeof practiceDateSchema>;

export const practiceDateRangeSchema = z
  .object({
    from: practiceDateSchema,
    to: practiceDateSchema,
  })
  .strict()
  .refine((range) => range.from <= range.to, "Practice date range is invalid.")
  .refine(
    (range) =>
      calendarDayNumber(range.to) - calendarDayNumber(range.from) <
      practiceHistoryWindowDays + practiceUtcBoundaryAllowanceDays,
    "Practice date range is too large.",
  );
export type PracticeDateRange = Readonly<z.infer<typeof practiceDateRangeSchema>>;

export const practiceCheckInSchema = z
  .object({
    towerId: towerIdSchema,
    protocolId: protocolIdSchema,
    protocolVersion: z.int().positive(),
    practiceDate: practiceDateSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PracticeCheckIn = Readonly<z.infer<typeof practiceCheckInSchema>>;

export const practiceCheckInListSchema = z
  .array(practiceCheckInSchema)
  .max(maximumPracticeHistoryRows)
  .superRefine((checkIns, context) => {
    const keys = new Set<string>();
    checkIns.forEach((checkIn, index) => {
      const key = [
        checkIn.towerId,
        checkIn.protocolId,
        checkIn.protocolVersion,
        checkIn.practiceDate,
      ].join(":");
      if (keys.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Practice history contains a duplicate check-in.",
        });
      }
      keys.add(key);
    });
  });

export type PracticeQueryResult<T> =
  Readonly<{ status: "available"; value: T }> | Readonly<{ status: "unavailable" }>;

export type PracticeMutationRejection = "invalid_input" | "not_found";

export type PracticeMutationResult =
  | Readonly<{ status: "available"; recorded: boolean }>
  | Readonly<{ status: "rejected"; reason: PracticeMutationRejection }>
  | Readonly<{ status: "unavailable" }>;

export const setPracticeCheckInInputSchema = z
  .object({
    towerId: towerIdSchema,
    protocolId: protocolIdSchema,
    protocolVersion: z.int().positive(),
    practiceDate: practiceDateSchema,
    recorded: z.boolean(),
  })
  .strict();
export type SetPracticeCheckInInput = Readonly<z.infer<typeof setPracticeCheckInInputSchema>>;

export interface PracticeCheckInRepository {
  listRecent(
    towerId: z.infer<typeof towerIdSchema>,
    range: PracticeDateRange,
  ): Promise<PracticeQueryResult<readonly PracticeCheckIn[]>>;
  set(input: SetPracticeCheckInInput): Promise<PracticeMutationResult>;
}

export function parsePracticeDate(input: unknown): PracticeDate {
  return practiceDateSchema.parse(input);
}

export function parsePracticeCheckIn(input: unknown): PracticeCheckIn {
  return practiceCheckInSchema.parse(input);
}

export function parsePracticeCheckIns(input: unknown): readonly PracticeCheckIn[] {
  return practiceCheckInListSchema.parse(input);
}

export function parseSetPracticeCheckInInput(input: unknown): SetPracticeCheckInInput {
  return setPracticeCheckInInputSchema.parse(input);
}

export function practiceDateWindow(reference: Date): PracticeDateRange {
  if (Number.isNaN(reference.getTime())) throw new Error("Practice date reference is invalid.");
  return practiceDateRangeSchema.parse({
    from: shiftUtcDate(reference, -(practiceCorrectionWindowDays - 1)),
    to: shiftUtcDate(reference, practiceUtcBoundaryAllowanceDays),
  });
}

export function assertPracticeDateWithinWindow(practiceDate: PracticeDate, reference: Date): void {
  const range = practiceDateWindow(reference);
  if (practiceDate < range.from || practiceDate > range.to) {
    throw new Error("Practice date is outside the accepted window.");
  }
}

export const trackingEngineStatus = "private-practice-checkins" as const;
