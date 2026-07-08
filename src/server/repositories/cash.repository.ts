import "server-only";

import { prisma } from "@/server/db/prisma";
import { appendAuditLog } from "@/server/audit/audit.service";

type OpenCashRow = { id: string };

function toCents(value: { toString(): string }) {
  const [whole, decimal = ""] = value.toString().split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0").slice(0, 2));
}

function toDecimal(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export class CashRepository {
  async findOpenSession(businessId: string) {
    return prisma.cashSession.findFirst({
      where: { businessId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });
  }

  async getDashboard(businessId: string) {
    const [current, recentClosed] = await Promise.all([
      prisma.cashSession.findFirst({
        where: { businessId, status: "OPEN" },
        include: {
          openedByUser: { select: { name: true } },
          cashMovements: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
          sales: {
            where: { status: "COMPLETED" },
            include: { payments: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.cashSession.findMany({
        where: { businessId, status: "CLOSED" },
        include: {
          openedByUser: { select: { name: true } },
          cashMovements: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
          sales: { where: { status: "COMPLETED" }, include: { payments: true } },
        },
        orderBy: { closedAt: "desc" },
        take: 10,
      }),
    ]);
    return { current, recentClosed };
  }

  async openSession(data: {
    businessId: string;
    userId: string;
    dailyDate: string;
    openingAmount: string;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          businessId: data.businessId,
          openedByUserId: data.userId,
          dailyDate: data.dailyDate,
          openingAmount: data.openingAmount,
          notes: data.notes,
          status: "OPEN",
        },
      });
      await tx.cashMovement.create({
        data: {
          businessId: data.businessId,
          cashSessionId: session.id,
          userId: data.userId,
          type: "OPENING",
          amount: data.openingAmount,
          reason: "Abertura de caixa",
        },
      });
      await appendAuditLog({
        businessId: data.businessId,
        userId: data.userId,
        action: "CASH_SESSION_OPENED",
        entity: "CashSession",
        entityId: session.id,
        after: {
          status: session.status,
          openingAmount: session.openingAmount.toString(),
          dailyDate: session.dailyDate,
          openedAt: session.openedAt.toISOString(),
        },
      }, tx);
      return session;
    });
  }

  async closeSession(data: {
    businessId: string;
    cashSessionId: string;
    closedByUserId: string;
    closingAmountCents: number;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<OpenCashRow[]>`
        SELECT "id" FROM "CashSession"
        WHERE "id" = ${data.cashSessionId}
          AND "businessId" = ${data.businessId}
          AND "status" = 'OPEN'
        FOR UPDATE
      `;
      if (!locked[0]) throw new Error("O caixa já foi fechado.");

      const summary = await tx.cashSession.findUniqueOrThrow({
        where: { id: data.cashSessionId },
        include: {
          cashMovements: true,
          sales: { where: { status: "COMPLETED" }, include: { payments: true } },
        },
      });
      const cashReceipts = summary.sales.flatMap((sale) => sale.payments)
        .filter((payment) => payment.method === "CASH")
        .reduce((sum, payment) => sum + toCents(payment.amount), 0);
      const supplies = summary.cashMovements
        .filter((movement) => movement.type === "CASH_IN")
        .reduce((sum, movement) => sum + toCents(movement.amount), 0);
      const withdrawals = summary.cashMovements
        .filter((movement) => movement.type === "CASH_OUT")
        .reduce((sum, movement) => sum + toCents(movement.amount), 0);
      const expectedCents = toCents(summary.openingAmount) + cashReceipts + supplies - withdrawals;
      const differenceCents = data.closingAmountCents - expectedCents;

      const session = await tx.cashSession.update({
        where: { id: data.cashSessionId },
        data: {
          closedByUserId: data.closedByUserId,
          status: "CLOSED",
          closingAmount: toDecimal(data.closingAmountCents),
          expectedAmount: toDecimal(expectedCents),
          difference: toDecimal(differenceCents),
          closedAt: new Date(),
          notes: data.notes,
        },
      });
      await tx.cashMovement.create({
        data: {
          businessId: data.businessId,
          cashSessionId: data.cashSessionId,
          userId: data.closedByUserId,
          type: "CLOSING",
          amount: toDecimal(data.closingAmountCents),
          reason: `Fechamento: esperado ${toDecimal(expectedCents)}; diferença ${toDecimal(differenceCents)}`,
        },
      });
      await appendAuditLog({
        businessId: data.businessId,
        userId: data.closedByUserId,
        action: "CASH_SESSION_CLOSED",
        entity: "CashSession",
        entityId: session.id,
        before: {
          status: summary.status,
          closingAmount: null,
          expectedAmount: null,
          difference: null,
        },
        after: {
          status: session.status,
          closingAmount: session.closingAmount?.toString() ?? null,
          expectedAmount: session.expectedAmount?.toString() ?? null,
          difference: session.difference?.toString() ?? null,
          closedAt: session.closedAt?.toISOString() ?? null,
        },
        metadata: {
          cashReceipts: toDecimal(cashReceipts),
          supplies: toDecimal(supplies),
          withdrawals: toDecimal(withdrawals),
        },
      }, tx);
      return session;
    });
  }

  async addMovement(data: {
    businessId: string;
    cashSessionId: string;
    userId: string;
    type: "CASH_IN" | "CASH_OUT";
    amount: string;
    reason: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<OpenCashRow[]>`
        SELECT "id" FROM "CashSession"
        WHERE "id" = ${data.cashSessionId}
          AND "businessId" = ${data.businessId}
          AND "status" = 'OPEN'
        FOR UPDATE
      `;
      if (!locked[0]) throw new Error("O caixa está fechado.");
      const movement = await tx.cashMovement.create({ data });
      await appendAuditLog({
        businessId: data.businessId,
        userId: data.userId,
        action: data.type === "CASH_IN" ? "CASH_SUPPLY_CREATED" : "CASH_WITHDRAWAL_CREATED",
        entity: "CashMovement",
        entityId: movement.id,
        reason: data.reason,
        after: {
          cashSessionId: movement.cashSessionId,
          type: movement.type,
          amount: movement.amount.toString(),
          reason: movement.reason,
          createdAt: movement.createdAt.toISOString(),
        },
      }, tx);
      return movement;
    });
  }
}
