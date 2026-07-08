import "server-only";

import type { UserRole } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthContext, type AuthContext } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";

const ALL_ROLES = ["OWNER", "MANAGER", "CASHIER", "WAITER"] as const;

export const PERMISSIONS = {
  VIEW_OPERATION_DASHBOARD: ALL_ROLES,
  VIEW_PRODUCTS: ALL_ROLES,
  MANAGE_PRODUCTS: ["OWNER", "MANAGER"],
  VIEW_SALES: ALL_ROLES,
  CREATE_SALE: ALL_ROLES,
  APPLY_DISCOUNT: ["OWNER", "MANAGER"],
  MANAGE_TABS: ALL_ROLES,
  CONFIGURE_TABLES: ["OWNER", "MANAGER"],
  CANCEL_SALE: ["OWNER", "MANAGER"],
  VIEW_CASH: ["OWNER", "MANAGER", "CASHIER"],
  OPEN_CASH_SESSION: ["OWNER", "MANAGER", "CASHIER"],
  CLOSE_CASH_SESSION: ["OWNER", "MANAGER", "CASHIER"],
  REGISTER_CASH_MOVEMENT: ["OWNER", "MANAGER", "CASHIER"],
  VIEW_REPORTS: ["OWNER", "MANAGER"],
  VIEW_INVENTORY: ["OWNER", "MANAGER", "CASHIER"],
  MANAGE_INVENTORY: ["OWNER", "MANAGER"],
  MANAGE_USERS: ["OWNER"],
  MANAGE_CRITICAL_SETTINGS: ["OWNER"],
  VIEW_AUDIT_LOGS: ["OWNER"],
  VIEW_PRINT_QUEUE: ALL_ROLES,
  MANAGE_PRINT_QUEUE: ["OWNER", "MANAGER", "CASHIER"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

async function logAccessDenied(ctx: AuthContext, permission: Permission) {
  const requestHeaders = await headers();

  await prisma.auditLog.create({
    data: {
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "ACCESS_DENIED",
      entity: "Permission",
      entityId: permission,
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
      metadata: {
        permission,
        role: ctx.role,
      },
    },
  });
}

export async function requirePermission(permission: Permission) {
  const ctx = await requireAuthContext();

  if (!can(ctx.role, permission)) {
    await logAccessDenied(ctx, permission);
    throw new AppError({
      code: "ACCESS_DENIED",
      message: "Você não tem permissão para executar esta ação.",
      statusCode: 403,
      details: { permission },
    });
  }

  return ctx;
}

export async function requireRoutePermission(permission: Permission) {
  const ctx = await requireAuthContext();

  if (!can(ctx.role, permission)) {
    await logAccessDenied(ctx, permission);
    redirect("/acesso-negado");
  }

  return ctx;
}
