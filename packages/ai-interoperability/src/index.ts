export type ModelNeutralPrompt = Readonly<{
  title: string;
  system: string | null;
  user: string;
}>;

export type AiReadyExport = Readonly<{
  schemaVersion: string;
  contentType: string;
  payload: unknown;
}>;

export interface ReadOnlyMcpSurface {
  listResources(): Promise<readonly string[]>;
  readResource(uri: string): Promise<unknown>;
}

export const aiInteroperabilityStatus = "disabled-foundation" as const;
