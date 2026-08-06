import { protocolIdSchema } from "@protostack/protocol-engine";
import { towerIdSchema } from "@protostack/tower-engine";
import { describe, expect, it } from "vitest";
import {
  assertPracticeDateWithinWindow,
  maximumPracticeHistoryRows,
  parsePracticeCheckIn,
  parsePracticeCheckIns,
  parsePracticeDate,
  parseSetPracticeCheckInInput,
  practiceCorrectionWindowDays,
  practiceDateRangeSchema,
  practiceDateWindow,
  practiceHistoryWindowDays,
  trackingEngineStatus,
} from "./index";

const towerId = towerIdSchema.parse("20000000-0000-4000-8000-000000000001");
const protocolId = protocolIdSchema.parse("10000000-0000-4000-8000-000000000001");
const reference = new Date("2026-08-06T12:00:00.000Z");
const checkIn = {
  towerId,
  protocolId,
  protocolVersion: 2,
  practiceDate: "2026-08-06",
  createdAt: "2026-08-06T12:30:00.000Z",
};

describe("private practice domain", () => {
  it("activates only the narrowly typed check-in boundary", () => {
    expect(trackingEngineStatus).toBe("private-practice-checkins");
    expect(practiceCorrectionWindowDays).toBe(30);
    expect(practiceHistoryWindowDays).toBe(30);
    expect(maximumPracticeHistoryRows).toBe(620);
  });

  it("parses real calendar dates and rejects malformed or impossible dates", () => {
    expect(parsePracticeDate("2026-02-28")).toBe("2026-02-28");
    expect(() => parsePracticeDate("2026-02-29")).toThrow();
    expect(() => parsePracticeDate("08/06/2026")).toThrow();
    expect(() => parsePracticeDate("2026-8-6")).toThrow();
  });

  it("builds a bounded correction and history window", () => {
    expect(practiceDateWindow(reference)).toEqual({ from: "2026-07-08", to: "2026-08-07" });
  });

  it("rejects caller-selected history ranges beyond the reviewed bound", () => {
    expect(() => practiceDateRangeSchema.parse({ from: "2026-07-07", to: "2026-08-07" })).toThrow();
  });

  it("rejects an invalid reference clock", () => {
    expect(() => practiceDateWindow(new Date(Number.NaN))).toThrow();
  });

  it("accepts dates inside the window and rejects dates outside it", () => {
    expect(() =>
      assertPracticeDateWithinWindow(parsePracticeDate("2026-07-08"), reference),
    ).not.toThrow();
    expect(() =>
      assertPracticeDateWithinWindow(parsePracticeDate("2026-08-07"), reference),
    ).not.toThrow();
    expect(() =>
      assertPracticeDateWithinWindow(parsePracticeDate("2026-07-07"), reference),
    ).toThrow();
    expect(() =>
      assertPracticeDateWithinWindow(parsePracticeDate("2026-08-08"), reference),
    ).toThrow();
  });

  it("parses one exact check-in without an owner or arbitrary payload", () => {
    expect(parsePracticeCheckIn(checkIn)).toEqual(checkIn);
    expect(() => parsePracticeCheckIn({ ...checkIn, ownerId: "private" })).toThrow();
    expect(() => parsePracticeCheckIn({ ...checkIn, payload: { note: "not allowed" } })).toThrow();
  });

  it("requires positive immutable protocol versions and offset timestamps", () => {
    expect(() => parsePracticeCheckIn({ ...checkIn, protocolVersion: 0 })).toThrow();
    expect(() => parsePracticeCheckIn({ ...checkIn, createdAt: "2026-08-06" })).toThrow();
  });

  it("parses the exact owner-free record and undo command", () => {
    const command = {
      towerId,
      protocolId,
      protocolVersion: 2,
      practiceDate: "2026-08-06",
      recorded: true,
    };
    expect(parseSetPracticeCheckInInput(command)).toEqual(command);
    expect(() => parseSetPracticeCheckInInput({ ...command, ownerId: "private" })).toThrow();
    expect(() => parseSetPracticeCheckInInput({ ...command, protocolVersion: 0 })).toThrow();
    expect(() => parseSetPracticeCheckInInput({ ...command, recorded: "true" })).toThrow();
  });

  it("rejects duplicate historical keys", () => {
    expect(() => parsePracticeCheckIns([checkIn, checkIn])).toThrow();
  });

  it("caps provider history responses", () => {
    const oversized = Array.from({ length: maximumPracticeHistoryRows + 1 }, (_, index) => ({
      ...checkIn,
      protocolId: protocolIdSchema.parse(
        `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ),
    }));
    expect(() => parsePracticeCheckIns(oversized)).toThrow();
  });
});
