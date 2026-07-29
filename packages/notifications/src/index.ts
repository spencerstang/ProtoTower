export type Notification = Readonly<{
  channel: "email" | "in-app";
  template: string;
  recipientRef: string;
}>;

export interface NotificationProvider {
  send(notification: Notification): Promise<{ accepted: boolean }>;
}

export const disabledNotificationProvider: NotificationProvider = {
  send: async () => ({ accepted: false }),
};
