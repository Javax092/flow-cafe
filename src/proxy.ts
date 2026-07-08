import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/server/auth/cookies";

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function securityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  response.headers.set(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (request.nextUrl.protocol === "https:") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function isRateLimited(request: NextRequest) {
  const now = Date.now();
  const key = `${clientAddress(request)}:${request.nextUrl.pathname}`;
  const bucket = buckets.get(key);
  for (const [bucketKey, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(bucketKey);
  }

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > 180;
}

export function proxy(request: NextRequest) {
  if (isRateLimited(request)) {
    return securityHeaders(
      new NextResponse("Muitas requisições.", { status: 429 }),
      request,
    );
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!hasSessionCookie && !isLoginRoute) {
    return securityHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      request,
    );
  }

  return securityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
