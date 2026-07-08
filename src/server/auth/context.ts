import "server-only";

import type { UserRole } from "@prisma/client";

import { getCurrentAuthSession } from "./session";

export type AuthContext = {
  userId: string;
  businessId: string;
  role: UserRole;
  email: string;
  name: string;
};

export async function requireAuthContext(): Promise<AuthContext> {
  const session = await getCurrentAuthSession();

  if (!session) {
    throw new Error("Não autenticado.");
  }

  return {
    userId: session.user.id,
    businessId: session.user.businessId,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
}
