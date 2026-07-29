import { describe, expect, it } from "vitest";
import { protocolEngineStatus } from "./index";

describe("protocol-engine foundation", () => {
  it("keeps protocol behavior disabled", () => {
    expect(protocolEngineStatus).toBe("disabled-foundation");
  });
});
