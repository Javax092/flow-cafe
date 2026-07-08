import { cookies } from "next/headers";

import { env } from "@/config/env";

export const SESSION_COOKIE_NAME = "flow_session";

const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000),
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete({
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
