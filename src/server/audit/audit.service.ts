import "server-only";

import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";

type AuditClient = Prisma.TransactionClient | typeof prisma;

export type AuditEntry = {
  businessId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function appendAuditLog(entry: AuditEntry, tx: AuditClient = prisma) {
  return tx.auditLog.create({ data: entry });
}

export class AuditService {
  async listRecent() {
    const ctx = await requirePermission("VIEW_AUDIT_LOGS");
    return prisma.auditLog.findMany({
      where: { businessId: ctx.businessId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async recordDeniedAccessContext(entry: AuditEntry) {
    const requestHeaders = await headers();
    return prisma.auditLog.create({
      data: {
        ...entry,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? requestHeaders.get("x-real-ip"),
        userAgent: requestHeaders.get("user-agent"),
      },
    });
  }
}
