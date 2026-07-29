export type OutcomeMeasurement = Readonly<{
  measuredAt: string;
  metric: string;
  value: unknown;
}>;

export interface OutcomeRepository {
  record(measurement: OutcomeMeasurement): Promise<void>;
}

export const outcomesEngineStatus = "disabled-foundation" as const;
