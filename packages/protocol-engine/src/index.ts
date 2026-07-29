export type ProtocolId = string & { readonly __brand: "ProtocolId" };
export type ProtocolVersion = Readonly<{ id: ProtocolId; version: number }>;

export interface ProtocolRepository {
  findVersion(id: ProtocolId, version: number): Promise<ProtocolVersion | null>;
}

export const protocolEngineStatus = "disabled-foundation" as const;
