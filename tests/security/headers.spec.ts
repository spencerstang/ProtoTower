import { expect, test } from "@playwright/test";

test("baseline security headers are present", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("local build diagnostics expose metadata only", async ({ request }) => {
  const response = await request.get("/api/admin/build-info");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");

  const body: unknown = await response.json();
  expect(body).toMatchObject({ environment: "local" });
  expect(JSON.stringify(body)).not.toMatch(/password|secret|token|supabase|authorization/i);
});
