import { expect, test } from "@playwright/test";

test("baseline security headers use per-response script nonces", async ({ request }) => {
  const policies: string[] = [];
  for (const path of ["/", "/protocols", "/protocols/morning-light-routine", "/sign-in"]) {
    const response = await request.get(path);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toMatch(/script-src [^;]*'nonce-[^']+'/u);
    policies.push(policy);
  }
  expect(new Set(policies).size).toBe(policies.length);
});

test("rendered framework scripts carry the response nonce", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";
  const expectedNonce = policy.match(/'nonce-([^']+)'/u)?.[1];
  expect(expectedNonce).toBeTruthy();
  const scriptNonces = await page
    .locator("script")
    .evaluateAll((scripts) => scripts.map((script) => script.nonce));
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect(scriptNonces.every((nonce) => nonce === expectedNonce)).toBe(true);
});

test("auth intake is private, scanner-safe, and stages only a strict cookie", async ({
  request,
}) => {
  const response = await request.get(`/auth/intake?token_hash=${"a".repeat(64)}&type=email`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toBe("http://127.0.0.1:3000/auth/confirm");
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const cookie = response.headers()["set-cookie"] ?? "";
  expect(cookie).toContain("protostack-auth-intake=");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=strict");
  expect(cookie).not.toMatch(/access_token|refresh_token/u);
});

test("protected routes are private and fail closed for anonymous requests", async ({ request }) => {
  const response = await request.get("/towers", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers()["location"]).toContain("/sign-in");
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("local build diagnostics expose metadata only", async ({ request }) => {
  const response = await request.get("/api/admin/build-info");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");

  const body: unknown = await response.json();
  expect(body).toMatchObject({ environment: "local" });
  expect(JSON.stringify(body)).not.toMatch(/password|secret|token|supabase|authorization/i);
});

test("catalog responses do not expose provider configuration or unpublished content", async ({
  request,
}) => {
  const response = await request.get("/protocols");
  expect(response.ok()).toBe(true);
  const body = await response.text();

  expect(body).not.toMatch(/synthetic-playwright-anon-key|supabase\.co|authorization/i);
  expect(body).not.toContain("Unpublished evening revision");
  expect(body).not.toContain("Retired synthetic routine");
});
