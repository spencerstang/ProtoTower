import { describe, expect, it } from "vitest";
import { buildWeeklyCheckInReminder, deliverWeeklyCheckInReminders } from "./reminder";

const token = "11111111-1111-4111-8111-111111111111";

describe("weekly check-in reminders", () => {
  it("includes an opt-out link and accepts only synthetic .invalid addresses", () => {
    const message = buildWeeklyCheckInReminder({
      recipient: "weekly-check-in@example.invalid",
      appUrl: "https://prototower.ai/",
      optOutToken: token,
    });

    expect(message.recipient).toBe("weekly-check-in@example.invalid");
    expect(message.text).toContain(
      "https://prototower.ai/reminders/opt-out?token=11111111-1111-4111-8111-111111111111",
    );
    expect(message.text).not.toMatch(/score|worked|effective/iu);
    expect(() =>
      buildWeeklyCheckInReminder({
        recipient: "person@example.com",
        appUrl: "https://prototower.ai",
        optOutToken: token,
      }),
    ).toThrow(/synthetic/u);
  });

  it("does not call the transport when the feature is off", async () => {
    let calls = 0;
    const result = await deliverWeeklyCheckInReminders({
      enabled: false,
      messages: [
        buildWeeklyCheckInReminder({
          recipient: "weekly-check-in@example.invalid",
          appUrl: "http://127.0.0.1:3000",
          optOutToken: token,
        }),
      ],
      transport: {
        send: async () => {
          calls += 1;
          return { accepted: true };
        },
      },
    });

    expect(result).toEqual({ sent: 0, reason: "disabled" });
    expect(calls).toBe(0);
  });

  it("sends a synthetic message only after the feature is enabled", async () => {
    const sent: string[] = [];
    const result = await deliverWeeklyCheckInReminders({
      enabled: true,
      messages: [
        buildWeeklyCheckInReminder({
          recipient: "weekly-check-in@example.invalid",
          appUrl: "http://127.0.0.1:3000",
          optOutToken: token,
        }),
      ],
      transport: {
        send: async (message) => {
          sent.push(message.recipient);
          return { accepted: true };
        },
      },
    });

    expect(result).toEqual({ sent: 1, reason: "sent" });
    expect(sent).toEqual(["weekly-check-in@example.invalid"]);
  });

  it("refuses a real recipient before any send", async () => {
    let calls = 0;
    await expect(
      deliverWeeklyCheckInReminders({
        enabled: true,
        messages: [
          {
            recipient: "person@example.com",
            subject: "ProtoTower check-in is ready",
            text: "Turn off these reminders: https://prototower.ai/reminders/opt-out?token=x",
          },
        ],
        transport: {
          send: async () => {
            calls += 1;
            return { accepted: true };
          },
        },
      }),
    ).rejects.toThrow(/synthetic/u);
    expect(calls).toBe(0);
  });
});
