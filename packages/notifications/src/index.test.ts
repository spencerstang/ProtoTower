import { describe, expect, it } from "vitest";
import { disabledNotificationProvider } from "./index";

describe("notifications foundation", () => {
  it("rejects delivery without a configured provider", async () => {
    await expect(
      disabledNotificationProvider.send({
        channel: "email",
        template: "synthetic-test",
        recipientRef: "synthetic-recipient",
      }),
    ).resolves.toEqual({ accepted: false });
  });
});
