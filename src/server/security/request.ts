import "server-only";

export function clientAddress(requestHeaders: Headers) {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? requestHeaders.get("x-real-ip")
    ?? "unknown";
}
