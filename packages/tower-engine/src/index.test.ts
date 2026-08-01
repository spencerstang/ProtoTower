import { protocolIdSchema } from "@protostack/protocol-engine";
import { describe, expect, it } from "vitest";
import {
  addTowerItem,
  assertTowerCreationAllowed,
  maximumItemsPerTower,
  maximumTowersPerOwner,
  moveTowerItem,
  parsePersonalTower,
  parseTowerTitle,
  removeTowerItem,
} from "./index";

const protocolOne = protocolIdSchema.parse("10000000-0000-4000-8000-000000000001");
const protocolTwo = protocolIdSchema.parse("10000000-0000-4000-8000-000000000002");

const tower = {
  id: "20000000-0000-4000-8000-000000000001",
  title: "Sleep better",
  revision: 0,
  items: [
    { protocolId: protocolOne, protocolVersion: 2, position: 1 },
    { protocolId: protocolTwo, protocolVersion: 1, position: 2 },
  ],
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

describe("tower domain", () => {
  it("normalizes a private goal title", () => {
    expect(parseTowerTitle("  Run   a marathon  ")).toBe("Run a marathon");
    expect(parseTowerTitle("Cafe\u0301 ritual")).toBe("Café ritual");
  });

  it("rejects empty, oversized, and control-character titles", () => {
    expect(() => parseTowerTitle("   ")).toThrow();
    expect(() => parseTowerTitle("a".repeat(81))).toThrow();
    expect(() => parseTowerTitle("Unsafe\u0000title")).toThrow();
  });

  it("parses an ordered tower and rejects unknown keys", () => {
    expect(parsePersonalTower(tower).title).toBe("Sleep better");
    expect(() => parsePersonalTower({ ...tower, ownerEmail: "private@example.test" })).toThrow();
  });

  it("rejects duplicate protocols and non-contiguous positions", () => {
    expect(() =>
      parsePersonalTower({
        ...tower,
        items: [tower.items[0], { protocolId: protocolOne, protocolVersion: 1, position: 3 }],
      }),
    ).toThrow();
  });

  it("enforces the per-owner tower limit", () => {
    expect(() => assertTowerCreationAllowed(maximumTowersPerOwner - 1)).not.toThrow();
    expect(() => assertTowerCreationAllowed(maximumTowersPerOwner)).toThrow();
  });

  it("adds a pinned protocol at the end", () => {
    const result = addTowerItem([], protocolOne, 2);
    expect(result).toEqual([{ protocolId: protocolOne, protocolVersion: 2, position: 1 }]);
  });

  it("rejects duplicate and oversized additions", () => {
    expect(() => addTowerItem(tower.items, protocolOne, 2)).toThrow();
    const full = Array.from({ length: maximumItemsPerTower }, (_, index) => ({
      protocolId: protocolIdSchema.parse(
        `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ),
      protocolVersion: 1,
      position: index + 1,
    }));
    expect(() => addTowerItem(full, protocolOne, 2)).toThrow();
  });

  it("removes an item and closes the position gap", () => {
    expect(removeTowerItem(tower.items, protocolOne)).toEqual([
      { protocolId: protocolTwo, protocolVersion: 1, position: 1 },
    ]);
  });

  it("moves items without leaving the tower bounds", () => {
    expect(moveTowerItem(tower.items, protocolTwo, "up").map((item) => item.protocolId)).toEqual([
      protocolTwo,
      protocolOne,
    ]);
    expect(moveTowerItem(tower.items, protocolOne, "up")).toBe(tower.items);
    expect(moveTowerItem(tower.items, protocolTwo, "down")).toBe(tower.items);
    expect(() =>
      moveTowerItem(
        tower.items,
        protocolIdSchema.parse("10000000-0000-4000-8000-000000000099"),
        "up",
      ),
    ).toThrow();
  });
});
