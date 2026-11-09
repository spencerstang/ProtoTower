export type ReminderMessage = Readonly<{
  recipient: string;
  subject: string;
  text: string;
}>;

export type ReminderTransport = Readonly<{
  send(message: ReminderMessage): Promise<{ accepted: boolean }>;
}>;

const syntheticRecipient = /^[^@\s]+@[^@\s]+\.invalid$/iu;

export function isSyntheticReminderRecipient(recipient: string): boolean {
  return syntheticRecipient.test(recipient);
}

export function buildWeeklyCheckInReminder(input: {
  recipient: string;
  appUrl: string;
  optOutToken: string;
}): ReminderMessage {
  if (!isSyntheticReminderRecipient(input.recipient)) {
    throw new Error("Reminder recipient is not a synthetic address.");
  }
  const appUrl = input.appUrl.replace(/\/$/u, "");
  const optOutUrl = `${appUrl}/reminders/opt-out?token=${input.optOutToken}`;
  return {
    recipient: input.recipient,
    subject: "ProtoTower check-in is ready",
    text: [
      "A weekly check-in is ready in ProtoTower.",
      `Open your towers: ${appUrl}/towers`,
      "This note does not include your goal or your results.",
      `Turn off these reminders: ${optOutUrl}`,
    ].join("\n"),
  };
}

export async function deliverWeeklyCheckInReminders(input: {
  enabled: boolean;
  messages: readonly ReminderMessage[];
  transport: ReminderTransport;
}): Promise<Readonly<{ sent: number; reason: "disabled" | "sent" }>> {
  if (!input.enabled) return { sent: 0, reason: "disabled" };
  for (const message of input.messages) {
    if (!isSyntheticReminderRecipient(message.recipient)) {
      throw new Error("Reminder recipient is not a synthetic address.");
    }
  }
  let sent = 0;
  for (const message of input.messages) {
    const result = await input.transport.send(message);
    if (result.accepted) sent += 1;
  }
  return { sent, reason: "sent" };
}
