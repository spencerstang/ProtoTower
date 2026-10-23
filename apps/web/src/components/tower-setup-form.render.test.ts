import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TowerSetupForm } from "./tower-setup-form";

describe("tower setup form markup", () => {
  it("renders the happy path and keeps anonymity inside the shared choice", () => {
    const html = renderToStaticMarkup(
      createElement(TowerSetupForm, {
        action: () => undefined,
        starters: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            version: 1,
            title: "Morning light",
            howTo: "Go outside after waking.",
          },
        ],
        catalogUnavailable: false,
        error: null,
        submitLabel: "Create tower",
      }),
    );

    expect(html).toContain("Goal or context");
    expect(html).toContain("Custom protocol name");
    expect(html).toContain("Custom how-to");
    expect(html).toContain("Goal complete");
    expect(html).toContain("Weight");
    expect(html).toContain("Sleep hours");
    expect(html).toContain("Add ongoing measures");
    expect(html).toContain("Add proxy measures");
    expect(html).toContain("Add a custom measure");
    expect(html).toContain('value="weekly"');
    expect(html).toContain('value="private"');
    expect(html).toContain("identity-choice");
    expect(html).toContain("Anonymous");
    expect(html).toContain("Create tower");
    expect(html).not.toContain("streak");

    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).toContain(".identity-choice");
    expect(css).toContain(
      '.visibility-fieldset:has(input[value="shared"]:checked) .identity-choice',
    );
  });
});
