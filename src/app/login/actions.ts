"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";
import {
  createAuthSession,
  revokeCurrentAuthSession,
} from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { clientAddress } from "@/server/security/request";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

// Mantém o custo do bcrypt mesmo quando o e-mail não existe.
const DUMMY_PASSWORD_HASH =
  "$2b$10$eg5lHu59NSGP3Dj8Ei.HFOv.6skm2Z7C..zWDAD2pNiyL44EwPrtC";

export type LoginState = { error?: string };

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const input = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!input.success) {
    return { error: "Informe um e-mail e uma senha válidos." };
  }

  const requestHeaders = await headers();
  const ipAddress = clientAddress(requestHeaders);
  await enforceRateLimit({
    key: `login:${ipAddress}:${input.data.email}`,
    limit: 8,
    windowMs: 60_000,
    message: "Muitas tentativas de login. Aguarde um minuto.",
  });

  const candidates = await prisma.user.findMany({
    where: {
      email: { equals: input.data.email, mode: "insensitive" },
      status: "ACTIVE",
      business: { isActive: true },
    },
    select: { id: true, businessId: true, passwordHash: true },
    take: 10,
  });

  if (candidates.length === 0) {
    await verifyPassword(input.data.password, DUMMY_PASSWORD_HASH);
  }

  const matches = (
    await Promise.all(
      candidates.map(async (user) => ({
        user,
        matches: await verifyPassword(input.data.password, user.passwordHash),
      })),
    )
  ).filter((result) => result.matches);

  const authenticatedUser = matches.length === 1 ? matches[0].user : null;
  const auditData = {
    email: input.data.email,
    success: Boolean(authenticatedUser),
    reason: authenticatedUser ? null : "INVALID_CREDENTIALS",
    businessId: authenticatedUser?.businessId,
    userId: authenticatedUser?.id,
    ipAddress,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  };

  await prisma.loginAudit.create({ data: auditData });

  if (!authenticatedUser) {
    return { error: "E-mail ou senha incorretos." };
  }

  await createAuthSession({
    businessId: authenticatedUser.businessId,
    userId: authenticatedUser.id,
    ipAddress: auditData.ipAddress,
    userAgent: auditData.userAgent,
  });

  redirect("/");
}

export async function logoutAction() {
  await revokeCurrentAuthSession();
  redirect("/login");
}
