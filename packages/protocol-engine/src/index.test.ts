import { describe, expect, it } from "vitest";
import { parseProtocolSlug, parsePublishedProtocol, protocolEngineStatus } from "./index";

const validProtocol = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "morning-light-routine",
  version: 1,
  title: "Morning light routine",
  summary: "A synthetic educational routine for beginning the day outdoors.",
  overview: "Use a short, comfortable outdoor period as a consistent start-of-day cue.",
  steps: [
    {
      position: 1,
      title: "Choose a safe location",
      description: "Select an accessible outdoor area away from traffic.",
    },
    {
      position: 2,
      title: "Spend a short period outside",
      description: "Remain comfortable and avoid looking directly at the sun.",
    },
  ],
  cautions: ["Avoid looking directly at the sun."],
  references: [
    {
      label: "Synthetic educational reference",
      url: "https://example.com/morning-light",
    },
  ],
  publishedAt: "2026-07-29T12:00:00.000Z",
};

describe("published protocol validation", () => {
  it("accepts a complete immutable catalog record", () => {
    expect(parsePublishedProtocol(validProtocol)).toEqual(validProtocol);
    expect(protocolEngineStatus).toBe("read-only-catalog");
  });

  it.each(["Morning-Light", "-morning-light", "morning_light", "ml"])(
    "rejects the invalid slug %s",
    (slug) => {
      expect(() => parseProtocolSlug(slug)).toThrow();
    },
  );

  it("rejects non-contiguous step positions", () => {
    expect(() =>
      parsePublishedProtocol({
        ...validProtocol,
        steps: [validProtocol.steps[0], { ...validProtocol.steps[1], position: 3 }],
      }),
    ).toThrow(/contiguous positions/);
  });

  it("rejects duplicate step titles", () => {
    expect(() =>
      parsePublishedProtocol({
        ...validProtocol,
        steps: [
          validProtocol.steps[0],
          { ...validProtocol.steps[1], title: "choose a SAFE location" },
        ],
      }),
    ).toThrow(/step titles must be unique/);
  });

  it("rejects versions without a caution", () => {
    expect(() => parsePublishedProtocol({ ...validProtocol, cautions: [] })).toThrow();
  });

  it("rejects non-HTTPS references", () => {
    expect(() =>
      parsePublishedProtocol({
        ...validProtocol,
        references: [{ label: "Unsafe reference", url: "http://example.com/reference" }],
      }),
    ).toThrow(/must use HTTPS/);
  });

  it("rejects unknown provider fields", () => {
    expect(() => parsePublishedProtocol({ ...validProtocol, provider_internal: true })).toThrow();
  });
});
