import { describe, expect, it } from "vitest";
import { planWeeklyReminderJob } from "./weekly-reminder-job";

describe("weekly reminder job", () => {
  it("stays disabled and sends nothing by default", () => {
    expect(planWeeklyReminderJob()).toEqual({ sent: 0, reason: "disabled" });
  });

  it("does not send when the flag is on, because no product mail transport is configured", () => {
    expect(planWeeklyReminderJob(true)).toEqual({ sent: 0, reason: "not_configured" });
  });
});
