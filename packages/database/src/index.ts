export type DatabaseEnvironment = "local" | "preview" | "staging" | "production";

export type DatabaseConnectionDescriptor = Readonly<{
  environment: DatabaseEnvironment;
  url: URL;
  readOnly: boolean;
}>;

export type MigrationDescriptor = Readonly<{
  version: string;
  name: string;
  checksum: string;
}>;

export type DatabaseHealth = Readonly<{
  status: "not-configured" | "available" | "unavailable";
  checkedAt: string;
}>;

export type { Database, Json } from "./generated/database.types";
