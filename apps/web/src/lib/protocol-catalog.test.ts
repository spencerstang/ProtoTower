import { describe, expect, it, vi } from "vitest";
import { parseProtocolSlug } from "@protostack/protocol-engine";
import { createProtocolCatalogRepository } from "./protocol-catalog";

const validRow = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "morning-light-routine",
  version: 2,
  title: "Morning outdoor cue",
  summary: "A revised synthetic routine for a safe outdoor pause.",
  overview: "Build a repeatable, comfortable start-of-day cue.",
  steps: [
    {
      position: 1,
      title: "Pick a repeatable cue",
      description: "Choose an ordinary morning transition.",
    },
  ],
  cautions: ["Never look directly at the sun."],
  reference_links: [
    {
      label: "Synthetic educational reference",
      url: "https://example.com/morning-cue",
    },
  ],
  published_at: "2026-07-29T13:00:00.000Z",
};

const connection = {
  baseUrl: new URL("https://synthetic.supabase.co"),
  anonKey: "synthetic-public-anon-key",
} as const;

const quietLogger = {
  warn: vi.fn(),
  error: vi.fn(),
};

describe("PostgREST protocol catalog adapter", () => {
  it("returns unavailable without touching the network when configuration is absent", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const repository = createProtocolCatalogRepository({ fetchImplementation });

    await expect(repository.listPublished()).resolves.toEqual({ status: "unavailable" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("maps an unknown provider row into a validated domain record", async () => {
    const fetchImplementation: typeof fetch = async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe(connection.anonKey);
      expect(headers.get("authorization")).toBe(`Bearer ${connection.anonKey}`);
      return new Response(JSON.stringify([validRow]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const repository = createProtocolCatalogRepository({
      connection,
      fetchImplementation,
      catalogLogger: quietLogger,
    });

    const result = await repository.listPublished();

    expect(result).toMatchObject({
      status: "available",
      value: [{ slug: "morning-light-routine", version: 2 }],
    });
  });

  it("uses a slug filter and returns one validated detail record", async () => {
    const fetchImplementation: typeof fetch = async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      expect(url.searchParams.get("slug")).toBe("eq.morning-light-routine");
      expect(url.searchParams.get("limit")).toBe("1");
      return new Response(JSON.stringify([validRow]));
    };
    const repository = createProtocolCatalogRepository({
      connection,
      fetchImplementation,
      catalogLogger: quietLogger,
    });

    const result = await repository.findPublishedBySlug(parseProtocolSlug("morning-light-routine"));

    expect(result).toMatchObject({
      status: "available",
      value: { title: "Morning outdoor cue" },
    });
  });

  it.each([
    { ...validRow, published_at: null },
    { ...validRow, provider_internal: true },
    { ...validRow, steps: [] },
  ])("fails closed when the provider payload is invalid", async (row) => {
    const repository = createProtocolCatalogRepository({
      connection,
      fetchImplementation: async () => new Response(JSON.stringify([row])),
      catalogLogger: quietLogger,
    });

    await expect(repository.listPublished()).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed without exposing the provider response body", async () => {
    const requestLogger = { warn: vi.fn(), error: vi.fn() };
    const repository = createProtocolCatalogRepository({
      connection,
      fetchImplementation: async () =>
        new Response('{"secret":"provider diagnostic"}', { status: 503 }),
      catalogLogger: requestLogger,
    });

    await expect(repository.listPublished()).resolves.toEqual({ status: "unavailable" });
    expect(JSON.stringify(requestLogger.warn.mock.calls)).not.toContain("provider diagnostic");
  });
});
