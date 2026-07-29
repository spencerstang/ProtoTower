export type TrackingEvent = Readonly<{
  occurredAt: string;
  kind: string;
  payload: unknown;
}>;

export interface TrackingEventStore {
  append(event: TrackingEvent): Promise<void>;
}

export const trackingEngineStatus = "disabled-foundation" as const;
