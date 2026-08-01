import type { Database } from "@protostack/database";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { serverOnlyCookieOptions } from "./lib/supabase/cookies";
import { buildContentSecurityPolicy } from "./lib/security-headers";

// OpenNext Cloudflare supports Edge Middleware but not Next.js 16's Node.js Proxy yet.
// Keep this deprecated filename until the adapter adds Node Middleware support.
function applyResponseHeaders(
  response: NextResponse,
  policy: string,
  privateResponse: boolean,
): void {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set(
    "Referrer-Policy",
    privateResponse ? "no-referrer" : "strict-origin-when-cross-origin",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (privateResponse) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const privateResponse = /^(?:\/auth(?:\/|$)|\/sign-in(?:\/|$)|\/towers(?:\/|$))/.test(
    request.nextUrl.pathname,
  );
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") && name.includes("-auth-token") && !name.includes("code-verifier"),
    );
  const url = process.env["SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"];
  let verifiedPrincipal = false;

  if (url && anonKey) {
    const secure = process.env["APP_ENV"] !== "local";
    const client = createServerClient<Database>(url, anonKey, {
      cookieOptions: { httpOnly: true, secure, sameSite: "lax", path: "/" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headersToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, serverOnlyCookieOptions(options, secure));
          });
          Object.entries(headersToSet).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    });
    try {
      const { data } = await client.auth.getClaims();
      verifiedPrincipal = Boolean(data?.claims.sub);
    } catch {
      // Public routes remain available. Protected routes verify again and fail closed.
    }
  }

  if (request.nextUrl.pathname.startsWith("/towers") && !verifiedPrincipal && !hasSessionCookie) {
    const publicOrigin = process.env["PUBLIC_APP_URL"] ?? request.nextUrl.origin;
    response = NextResponse.redirect(new URL("/sign-in", publicOrigin), 307);
  }

  applyResponseHeaders(
    response,
    policy,
    privateResponse || hasAuthCookie || response.cookies.getAll().length > 0,
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
