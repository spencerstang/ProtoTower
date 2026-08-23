import { NextResponse, type NextRequest } from "next/server";
import {
  authIntakeCookieName,
  createAuthIntakeCookie,
  parseAuthEmailOtpType,
  parseAuthTokenHash,
} from "@/lib/auth-intake";
import { getServerEnvironment } from "@/lib/runtime";

function privateRedirect(request: NextRequest, path: string): NextResponse {
  let baseUrl = request.nextUrl.origin;
  try {
    baseUrl = getServerEnvironment().PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
  } catch {
    // Invalid configuration still redirects to a clean, token-free local path.
  }
  const response = NextResponse.redirect(new URL(path, baseUrl), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function GET(request: NextRequest): NextResponse {
  const tokenHash = parseAuthTokenHash(request.nextUrl.searchParams.get("token_hash"));
  const type = parseAuthEmailOtpType(request.nextUrl.searchParams.get("type"));
  const response = privateRedirect(
    request,
    tokenHash && type ? "/auth/confirm" : "/auth/confirm?error=invalid",
  );
  response.cookies.delete(authIntakeCookieName);
  if (tokenHash && type) {
    response.cookies.set(authIntakeCookieName, createAuthIntakeCookie(type, tokenHash), {
      httpOnly: true,
      secure: process.env["APP_ENV"] !== "local",
      sameSite: "strict",
      maxAge: 600,
      path: "/auth",
    });
  }
  return response;
}
