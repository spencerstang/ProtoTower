import { describe, expect, it } from "vitest";
import { disabledAuditSink } from "./index";

describe("audit foundation", () => {
  it("provides a provider-neutral disabled sink", async () => {
    await expect(
      disabledAuditSink.record({
        action: "synthetic_test",
        occurredAt: new Date(0).toISOString(),
        actorId: null,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });
});
