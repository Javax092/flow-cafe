import "server-only";

import type { UserRole } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthContext, type AuthContext } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";

const ALL_ROLES = ["ADMIN", "GARCOM", "OWNER", "MANAGER", "CASHIER", "WAITER"] as const;
const ADMIN_ROLES = ["ADMIN", "OWNER", "MANAGER"] as const;
const OPERATION_ROLES = ["ADMIN", "GARCOM", "OWNER", "MANAGER", "CASHIER", "WAITER"] as const;

export const PERMISSIONS = {
  VIEW_OPERATION_DASHBOARD: ALL_ROLES,
  VIEW_PRODUCTS: ALL_ROLES,
  MANAGE_PRODUCTS: ADMIN_ROLES,
  VIEW_SALES: ALL_ROLES,
  CREATE_SALE: OPERATION_ROLES,
  APPLY_DISCOUNT: ADMIN_ROLES,
  MANAGE_TABS: OPERATION_ROLES,
  CONFIGURE_TABLES: ADMIN_ROLES,
  CANCEL_SALE: ADMIN_ROLES,
  VIEW_CASH: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
  OPEN_CASH_SESSION: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
  CLOSE_CASH_SESSION: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
  REGISTER_CASH_MOVEMENT: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
  VIEW_REPORTS: ADMIN_ROLES,
  VIEW_INVENTORY: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
  MANAGE_INVENTORY: ADMIN_ROLES,
  MANAGE_USERS: ["ADMIN", "OWNER"],
  MANAGE_CRITICAL_SETTINGS: ["ADMIN", "OWNER"],
  VIEW_AUDIT_LOGS: ["ADMIN", "OWNER"],
  VIEW_PRINT_QUEUE: ALL_ROLES,
  MANAGE_PRINT_QUEUE: ["ADMIN", "OWNER", "MANAGER", "CASHIER"],
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
