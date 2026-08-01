import {
  parsePublishedProtocol,
  type CatalogQueryResult,
  type ProtocolCatalogRepository,
  type ProtocolSlug,
  type PublishedProtocol,
} from "@protostack/protocol-engine";
import type { StructuredLogger } from "@protostack/configuration";
import { getServerEnvironment, logger } from "./runtime";

const catalogPath = "/rest/v1/published_protocol_catalog";
const catalogColumns = [
  "id",
  "slug",
  "version",
  "title",
  "summary",
  "overview",
  "steps",
  "cautions",
  "reference_links",
  "published_at",
] as const;
const allowedCatalogKeys = new Set<string>(catalogColumns);

export type ProtocolCatalogConnection = Readonly<{
  baseUrl: URL;
  anonKey: string;
}>;

type CatalogLogger = Pick<StructuredLogger, "warn" | "error">;

type ProtocolCatalogOptions = Readonly<{
  connection?: ProtocolCatalogConnection;
  fetchImplementation?: typeof fetch;
  catalogLogger?: CatalogLogger;
  timeoutMilliseconds?: number;
}>;

const unavailable = <T>(): CatalogQueryResult<T> => ({ status: "unavailable" });

function recordFromUnknown(input: unknown): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Catalog row must be an object.");
  }

  const record = input as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  if (keys.length !== catalogColumns.length || keys.some((key) => !allowedCatalogKeys.has(key))) {
    throw new Error("Catalog row has an unexpected shape.");
  }

  return record;
}

function parseCatalogRow(input: unknown): PublishedProtocol {
  const row = recordFromUnknown(input);
  return parsePublishedProtocol({
    id: row["id"],
    slug: row["slug"],
    version: row["version"],
    title: row["title"],
    summary: row["summary"],
    overview: row["overview"],
    steps: row["steps"],
    cautions: row["cautions"],
    references: row["reference_links"],
    publishedAt: row["published_at"],
  });
}

function parseCatalogRows(input: unknown): readonly PublishedProtocol[] {
  if (!Array.isArray(input)) {
    throw new Error("Catalog response must be an array.");
  }
  return input.map(parseCatalogRow);
}

function catalogUrl(baseUrl: URL): URL {
  return new URL(catalogPath, baseUrl);
}

export function createProtocolCatalogRepository(
  options: ProtocolCatalogOptions,
): ProtocolCatalogRepository {
  const connection = options.connection;
  if (!connection) {
    return {
      listPublished: async () => unavailable(),
      findPublishedBySlug: async () => unavailable(),
    };
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const catalogLogger = options.catalogLogger ?? logger;
  const timeoutMilliseconds = options.timeoutMilliseconds ?? 3_000;

  const request = async (
    url: URL,
    operation: "list" | "detail",
  ): Promise<CatalogQueryResult<readonly PublishedProtocol[]>> => {
    try {
      const response = await fetchImplementation(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          apikey: connection.anonKey,
          authorization: `Bearer ${connection.anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMilliseconds),
      });

      if (!response.ok) {
        catalogLogger.warn("protocol_catalog_provider_rejected_request", {
          operation,
          status: response.status,
        });
        return unavailable();
      }

      const payload: unknown = await response.json();
      return { status: "available", value: parseCatalogRows(payload) };
    } catch {
      catalogLogger.warn("protocol_catalog_request_unavailable", { operation });
      return unavailable();
    }
  };

  return {
    async listPublished() {
      const url = catalogUrl(connection.baseUrl);
      url.searchParams.set("select", catalogColumns.join(","));
      url.searchParams.set("order", "title.asc");
      return request(url, "list");
    },
    async findPublishedBySlug(slug: ProtocolSlug) {
      const url = catalogUrl(connection.baseUrl);
      url.searchParams.set("select", catalogColumns.join(","));
      url.searchParams.set("slug", `eq.${slug}`);
      url.searchParams.set("limit", "1");

      const result = await request(url, "detail");
      if (result.status === "unavailable") return result;
      if (result.value.length > 1) {
        catalogLogger.error("protocol_catalog_detail_not_unique");
        return unavailable();
      }

      return { status: "available", value: result.value[0] ?? null };
    },
  };
}

export function createServerProtocolCatalogRepository(): ProtocolCatalogRepository {
  try {
    const environment = getServerEnvironment();
    if (!environment.SUPABASE_URL || !environment.SUPABASE_ANON_KEY) {
      return createProtocolCatalogRepository({});
    }

    return createProtocolCatalogRepository({
      connection: {
        baseUrl: new URL(environment.PROTOCOL_CATALOG_URL ?? environment.SUPABASE_URL),
        anonKey: environment.PROTOCOL_CATALOG_ANON_KEY ?? environment.SUPABASE_ANON_KEY,
      },
    });
  } catch {
    logger.error("protocol_catalog_invalid_environment");
    return createProtocolCatalogRepository({});
  }
}
