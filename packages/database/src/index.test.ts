import { describe, expect, it } from "vitest";
import type { DatabaseHealth } from "./index";

describe("database provider boundary", () => {
  it("represents an optional database dependency", () => {
    const health: DatabaseHealth = {
      status: "not-configured",
      checkedAt: new Date(0).toISOString(),
    };
    expect(health.status).toBe("not-configured");
  });
});
