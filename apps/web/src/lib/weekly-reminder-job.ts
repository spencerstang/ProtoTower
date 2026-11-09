import { isFeatureEnabled } from "@protostack/configuration";

export function planWeeklyReminderJob(
  enabled = isFeatureEnabled("weeklyCheckInReminders"),
): Readonly<{
  sent: 0;
  reason: "disabled" | "not_configured";
}> {
  if (!enabled) return { sent: 0, reason: "disabled" };
  return { sent: 0, reason: "not_configured" };
}
