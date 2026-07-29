export type AuditEvent = Readonly<{
  action: string;
  occurredAt: string;
  actorId: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}

export const disabledAuditSink: AuditSink = {
  record: async () => undefined,
};
