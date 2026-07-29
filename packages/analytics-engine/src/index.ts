export type AnalyticsEvent = Readonly<{
  name: string;
  occurredAt: string;
  properties: Readonly<Record<string, unknown>>;
}>;

export interface AnalyticsSink {
  publish(event: AnalyticsEvent): Promise<void>;
}

export const disabledAnalyticsSink: AnalyticsSink = {
  publish: async () => undefined,
};
