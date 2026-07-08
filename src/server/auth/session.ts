import crypto from "node:crypto";

import "server-only";

import { prisma } from "@/server/db/prisma";
import { clearSessionCookie, getSessionCookie, setSessionCookie } from "./cookies";
import { hashToken } from "./tokens";

const SESSION_TTL_DAYS = 30;

export function generateSessionToken() {
  return crypto.randomBytes(64).toString("base64url");
}

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createAuthSession(data: {
  businessId: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
}) {
  const sessionToken = generateSessionToken();

  await prisma.authSession.create({
    data: {
      businessId: data.businessId,
      userId: data.userId,
      sessionTokenHash: hashToken(sessionToken),
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      deviceName: data.deviceName,
      expiresAt: getSessionExpiresAt(),
      lastSeenAt: new Date(),
    },
  });

  await setSessionCookie(sessionToken);

  return sessionToken;
}

export async function getCurrentAuthSession() {
  const sessionToken = await getSessionCookie();

  if (!sessionToken) return null;

  const session = await prisma.authSession.findUnique({
    where: {
      sessionTokenHash: hashToken(sessionToken),
    },
  });

  if (!session) return null;
  if (session.isRevoked) return null;
  if (session.expiresAt <= new Date()) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      businessId: session.businessId,
      status: "ACTIVE",
      business: { isActive: true },
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) return null;

  void prisma.authSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  }).catch(() => undefined);

  return { ...session, user };
}

export async function revokeCurrentAuthSession(reason = "logout") {
  const sessionToken = await getSessionCookie();

  if (sessionToken) {
    await prisma.authSession.updateMany({
      where: {
        sessionTokenHash: hashToken(sessionToken),
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  await clearSessionCookie();
}

export async function revokeAllUserSessions(userId: string, reason = "security") {
  await prisma.authSession.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}
