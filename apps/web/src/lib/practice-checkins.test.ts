import type { Database } from "@protostack/database";
import { protocolIdSchema } from "@protostack/protocol-engine";
import {
  maximumPracticeHistoryRows,
  parseSetPracticeCheckInInput,
  practiceDateWindow,
} from "@protostack/tracking-engine";
import { towerIdSchema } from "@protostack/tower-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPracticeCheckInRepository } from "./practice-checkins";

type ProviderResult = Readonly<{ data: unknown; error: unknown }>;

function mockClient(listResult: ProviderResult, mutationResult: ProviderResult) {
  const query: Record<string, unknown> = {};
  const select = vi.fn(() => query);
  const equals = vi.fn(() => query);
  const greaterThanOrEqual = vi.fn(() => query);
  const lessThanOrEqual = vi.fn(() => query);
  const order = vi.fn(() => query);
  const limit = vi.fn(async () => listResult);
  Object.assign(query, {
    select,
    eq: equals,
    gte: greaterThanOrEqual,
    lte: lessThanOrEqual,
    order,
    limit,
  });
  const from = vi.fn(() => query);
  const rpc = vi.fn(async () => mutationResult);
  const client = { from, rpc } as unknown as SupabaseClient<Database>;
  return { client, from, equals, greaterThanOrEqual, lessThanOrEqual, order, limit, rpc };
}

const towerId = towerIdSchema.parse("20000000-0000-4000-8000-000000000001");
const protocolId = protocolIdSchema.parse("10000000-0000-4000-8000-000000000001");
const range = practiceDateWindow(new Date("2026-08-06T12:00:00.000Z"));
const command = parseSetPracticeCheckInInput({
  towerId,
  protocolId,
  protocolVersion: 2,
  practiceDate: "2026-08-06",
  recorded: true,
});
const providerRow = {
  tower_id: towerId,
  protocol_id: protocolId,
  protocol_version: 2,
  practice_date: "2026-08-06",
  created_at: "2026-08-06T12:30:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("practice check-in provider boundary", () => {
  it("degrades when the optional provider is not configured", async () => {
    const repository = createPracticeCheckInRepository(null);
    await expect(repository.listRecent(towerId, range)).resolves.toEqual({
      status: "unavailable",
    });
    await expect(repository.set(command)).resolves.toEqual({ status: "unavailable" });
  });

  it("requests bounded owner-scoped history and parses an exact provider shape", async () => {
    const mocked = mockClient({ data: [providerRow], error: null }, { data: true, error: null });
    const repository = createPracticeCheckInRepository(mocked.client);

    await expect(repository.listRecent(towerId, range)).resolves.toEqual({
      status: "available",
      value: [
        {
          towerId,
          protocolId,
          protocolVersion: 2,
          practiceDate: "2026-08-06",
          createdAt: "2026-08-06T12:30:00.000Z",
        },
      ],
    });
    expect(mocked.from).toHaveBeenCalledWith("protocol_practice_checkins");
    expect(mocked.equals).toHaveBeenCalledWith("tower_id", towerId);
    expect(mocked.greaterThanOrEqual).toHaveBeenCalledWith("practice_date", range.from);
    expect(mocked.lessThanOrEqual).toHaveBeenCalledWith("practice_date", range.to);
    expect(mocked.order).toHaveBeenCalledTimes(3);
    expect(mocked.limit).toHaveBeenCalledWith(maximumPracticeHistoryRows + 1);
  });

  it("rejects malformed, expanded, or oversized provider history", async () => {
    const malformed = mockClient(
      { data: [{ ...providerRow, owner_id: "private" }], error: null },
      { data: true, error: null },
    );
    await expect(
      createPracticeCheckInRepository(malformed.client).listRecent(towerId, range),
    ).resolves.toEqual({ status: "unavailable" });

    const oversized = mockClient(
      {
        data: Array.from({ length: maximumPracticeHistoryRows + 1 }, () => providerRow),
        error: null,
      },
      { data: true, error: null },
    );
    await expect(
      createPracticeCheckInRepository(oversized.client).listRecent(towerId, range),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("sends the owner-free exact mutation and validates the minimal result", async () => {
    const mocked = mockClient({ data: [], error: null }, { data: true, error: null });
    await expect(createPracticeCheckInRepository(mocked.client).set(command)).resolves.toEqual({
      status: "available",
      recorded: true,
    });
    expect(mocked.rpc).toHaveBeenCalledWith("set_protocol_practice_checkin", {
      candidate_tower_id: towerId,
      candidate_protocol_id: protocolId,
      candidate_protocol_version: 2,
      candidate_practice_date: "2026-08-06",
      candidate_recorded: true,
    });

    const malformed = mockClient({ data: [], error: null }, { data: "true", error: null });
    await expect(createPracticeCheckInRepository(malformed.client).set(command)).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("maps reviewed provider codes without logging private mutation data", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const notFound = mockClient(
      { data: [], error: null },
      { data: null, error: { code: "P0002", message: "private provider detail" } },
    );
    await expect(createPracticeCheckInRepository(notFound.client).set(command)).resolves.toEqual({
      status: "rejected",
      reason: "not_found",
    });
    expect(log).not.toHaveBeenCalled();

    const unavailable = mockClient(
      { data: [], error: null },
      { data: null, error: { code: "50000", message: "private provider detail" } },
    );
    await expect(createPracticeCheckInRepository(unavailable.client).set(command)).resolves.toEqual(
      { status: "unavailable" },
    );
    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0]?.[0]);
    expect(line).not.toContain("private provider detail");
    expect(line).not.toContain(towerId);
    expect(line).not.toContain(protocolId);
    expect(line).not.toContain("practiceDate");
    expect(line).not.toContain("practice_date");
  });
});
