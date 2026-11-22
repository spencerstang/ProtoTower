import { NextResponse, type NextRequest } from "next/server";
import {
  authIntakeCookieName,
  createAuthIntakeCookie,
  parseAuthEmailOtpType,
  parseAuthTokenHash,
} from "@/lib/auth-intake";
import {
  authReturnCookieName,
  parseAuthReturnPath,
  returnPathFromEmailRedirect,
} from "@/lib/auth-return";
import { getServerEnvironment } from "@/lib/runtime";

function appOrigin(request: NextRequest): string {
  try {
    return new URL(getServerEnvironment().PUBLIC_APP_URL ?? "http://127.0.0.1:3000").origin;
  } catch {
    return request.nextUrl.origin;
  }
}

function privateRedirect(origin: string, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, origin), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function GET(request: NextRequest): NextResponse {
  const tokenHash = parseAuthTokenHash(request.nextUrl.searchParams.get("token_hash"));
  const type = parseAuthEmailOtpType(request.nextUrl.searchParams.get("type"));
  const origin = appOrigin(request);
  const response = privateRedirect(
    origin,
    tokenHash && type ? "/auth/confirm" : "/auth/confirm?error=invalid",
  );
  response.cookies.delete(authIntakeCookieName);
  if (tokenHash && type) {
    const next =
      returnPathFromEmailRedirect(request.nextUrl.searchParams.get("redirect_to"), origin) ??
      parseAuthReturnPath(request.cookies.get(authReturnCookieName)?.value);
    response.cookies.set(authIntakeCookieName, createAuthIntakeCookie(type, tokenHash, next), {
      httpOnly: true,
      secure: process.env["APP_ENV"] !== "local",
      sameSite: "strict",
      maxAge: 600,
      path: "/auth",
    });
  }
  return response;
}
