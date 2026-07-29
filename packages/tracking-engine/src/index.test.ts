import { describe, expect, it } from "vitest";
import { trackingEngineStatus } from "./index";

describe("tracking-engine foundation", () => {
  it("keeps adherence tracking disabled", () => {
    expect(trackingEngineStatus).toBe("disabled-foundation");
  });
});
