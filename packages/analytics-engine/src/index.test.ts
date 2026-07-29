import { describe, expect, it } from "vitest";
import { disabledAnalyticsSink } from "./index";

describe("analytics-engine foundation", () => {
  it("does not require an analytics provider", async () => {
    await expect(
      disabledAnalyticsSink.publish({
        name: "synthetic_test",
        occurredAt: new Date(0).toISOString(),
        properties: {},
      }),
    ).resolves.toBeUndefined();
  });
});
