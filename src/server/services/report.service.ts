import "server-only";

import { Prisma, type PaymentMethod } from "@prisma/client";

import { APP } from "@/config/constants";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export type ReportMode = "daily" | "monthly";

type DecimalValue = { toString(): string };

type ProductReportRow = {
  key: string;
  name: string;
  category: string | null;
  quantity: bigint;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
};

type CategoryReportRow = {
  key: string;
  name: string;
  quantity: bigint;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
};

type OperatorReportRow = {
  userId: string;
  name: string;
  salesCount: bigint;
  revenue: Prisma.Decimal;
  discount: Prisma.Decimal;
  cost: Prisma.Decimal;
};

function currentDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function parseDate(value: string) {
  if (!ISO_DATE.test(value)) throw new Error("Data inválida.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Data inválida.");
  }
  return date;
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function toNumber(value: DecimalValue | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function sum(values: DecimalValue[]) {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function defaultReportPeriod(mode: ReportMode) {
  const to = currentDate();
  if (mode === "monthly") return { from: monthStart(to), to };
  return { from: to, to };
}

export function normalizeReportMode(value?: string | null): ReportMode {
  return value === "monthly" ? "monthly" : "daily";
}

export class ReportService {
  async getReport(input: { from: string; to: string; mode: ReportMode }) {
    const ctx = await requirePermission("VIEW_REPORTS");
    const fromDate = parseDate(input.from);
    const toDate = parseDate(input.to);
    const durationDays = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
    if (durationDays < 1) throw new Error("A data inicial deve ser anterior à data final.");
    if (durationDays > 366) throw new Error("O período máximo é de 366 dias.");

    const saleFilter = {
      businessId: ctx.businessId,
      status: "COMPLETED" as const,
      dailyDate: { gte: input.from, lte: input.to },
    };

    const [
      summary,
      cancelledSummary,
      dailySales,
      paymentTotals,
      products,
      categories,
      operators,
      cashSessions,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: saleFilter,
        _sum: { subtotal: true, discount: true, total: true, costTotal: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: {
          businessId: ctx.businessId,
          status: "CANCELLED",
          dailyDate: { gte: input.from, lte: input.to },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.sale.groupBy({
        by: ["dailyDate"],
        where: saleFilter,
        _sum: { total: true, discount: true, costTotal: true },
        _count: { id: true },
        orderBy: { dailyDate: "asc" },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { businessId: ctx.businessId, sale: saleFilter },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { method: "asc" },
      }),
      prisma.$queryRaw<ProductReportRow[]>(Prisma.sql`
        SELECT
          COALESCE(si."productId", 'snapshot:' || si."productNameSnapshot") AS key,
          MAX(si."productNameSnapshot") AS name,
          MAX(c.name) AS category,
          SUM(si.quantity)::bigint AS quantity,
          SUM(si.subtotal) AS revenue,
          SUM(si."costSubtotal") AS cost
        FROM "SaleItem" si
        INNER JOIN "Sale" s ON s.id = si."saleId"
        LEFT JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        WHERE si."businessId" = ${ctx.businessId}
          AND s.status = 'COMPLETED'
          AND s."dailyDate" >= ${input.from}
          AND s."dailyDate" <= ${input.to}
        GROUP BY COALESCE(si."productId", 'snapshot:' || si."productNameSnapshot")
        ORDER BY revenue DESC, quantity DESC
      `),
      prisma.$queryRaw<CategoryReportRow[]>(Prisma.sql`
        SELECT
          COALESCE(c.id, 'sem-categoria') AS key,
          COALESCE(MAX(c.name), 'Sem categoria') AS name,
          SUM(si.quantity)::bigint AS quantity,
          SUM(si.subtotal) AS revenue,
          SUM(si."costSubtotal") AS cost
        FROM "SaleItem" si
        INNER JOIN "Sale" s ON s.id = si."saleId"
        LEFT JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        WHERE si."businessId" = ${ctx.businessId}
          AND s.status = 'COMPLETED'
          AND s."dailyDate" >= ${input.from}
          AND s."dailyDate" <= ${input.to}
        GROUP BY COALESCE(c.id, 'sem-categoria')
        ORDER BY revenue DESC, quantity DESC
      `),
      prisma.$queryRaw<OperatorReportRow[]>(Prisma.sql`
        SELECT
          u.id AS "userId",
          u.name AS name,
          COUNT(s.id)::bigint AS "salesCount",
          SUM(s.total) AS revenue,
          SUM(s.discount) AS discount,
          SUM(s."costTotal") AS cost
        FROM "Sale" s
        INNER JOIN "User" u ON u.id = s."userId"
        WHERE s."businessId" = ${ctx.businessId}
          AND s.status = 'COMPLETED'
          AND s."dailyDate" >= ${input.from}
          AND s."dailyDate" <= ${input.to}
        GROUP BY u.id, u.name
        ORDER BY revenue DESC, "salesCount" DESC
      `),
      prisma.cashSession.findMany({
        where: {
          businessId: ctx.businessId,
          dailyDate: { gte: input.from, lte: input.to },
        },
        include: {
          openedByUser: { select: { name: true } },
          cashMovements: true,
          sales: { where: { status: "COMPLETED" }, include: { payments: true } },
        },
        orderBy: [{ dailyDate: "asc" }, { openedAt: "asc" }],
      }),
    ]);

    const revenue = toNumber(summary._sum.total);
    const cost = toNumber(summary._sum.costTotal);
    const salesCount = summary._count.id;
    const discount = toNumber(summary._sum.discount);
    const subtotal = toNumber(summary._sum.subtotal);

    return {
      mode: input.mode,
      generatedAt: new Date(),
      period: { from: input.from, to: input.to, durationDays },
      summary: {
        subtotal,
        discount,
        revenue,
        cost,
        grossMargin: revenue - cost,
        grossMarginPercent: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
        salesCount,
        averageTicket: salesCount > 0 ? revenue / salesCount : 0,
        cancelledSalesCount: cancelledSummary._count.id,
        cancelledTotal: toNumber(cancelledSummary._sum.total),
      },
      dailySales: dailySales.map((day) => {
        const dayRevenue = toNumber(day._sum.total);
        const dayCost = toNumber(day._sum.costTotal);
        return {
          date: day.dailyDate,
          salesCount: day._count.id,
          revenue: dayRevenue,
          discount: toNumber(day._sum.discount),
          cost: dayCost,
          grossMargin: dayRevenue - dayCost,
        };
      }),
      paymentTotals: paymentTotals.map((payment) => ({
        method: payment.method,
        count: payment._count.id,
        amount: toNumber(payment._sum.amount),
      })),
      products: products.map((product) => {
        const revenueValue = toNumber(product.revenue);
        const costValue = toNumber(product.cost);
        return {
          key: product.key,
          name: product.name,
          category: product.category ?? "Sem categoria",
          quantity: Number(product.quantity),
          revenue: revenueValue,
          cost: costValue,
          grossMargin: revenueValue - costValue,
        };
      }),
      categories: categories.map((category) => {
        const revenueValue = toNumber(category.revenue);
        const costValue = toNumber(category.cost);
        return {
          key: category.key,
          name: category.name,
          quantity: Number(category.quantity),
          revenue: revenueValue,
          cost: costValue,
          grossMargin: revenueValue - costValue,
        };
      }),
      operators: operators.map((operator) => {
        const revenueValue = toNumber(operator.revenue);
        const costValue = toNumber(operator.cost);
        const sales = Number(operator.salesCount);
        return {
          userId: operator.userId,
          name: operator.name,
          salesCount: sales,
          revenue: revenueValue,
          discount: toNumber(operator.discount),
          cost: costValue,
          grossMargin: revenueValue - costValue,
          averageTicket: sales > 0 ? revenueValue / sales : 0,
        };
      }),
      cashClosures: cashSessions.map((session) => {
        const cashReceipts = sum(session.sales
          .flatMap((sale) => sale.payments)
          .filter((payment) => payment.method === "CASH")
          .map((payment) => payment.amount));
        const cashIn = sum(session.cashMovements
          .filter((movement) => movement.type === "CASH_IN")
          .map((movement) => movement.amount));
        const cashOut = sum(session.cashMovements
          .filter((movement) => movement.type === "CASH_OUT")
          .map((movement) => movement.amount));
        const openingAmount = toNumber(session.openingAmount);
        const calculatedExpected = openingAmount + cashReceipts + cashIn - cashOut;
        const expectedAmount = toNumber(session.expectedAmount) || calculatedExpected;
        const closingAmount = session.closingAmount == null ? null : toNumber(session.closingAmount);
        const difference = session.difference == null
          ? closingAmount == null ? null : closingAmount - calculatedExpected
          : toNumber(session.difference);
        const totalSales = sum(session.sales.map((sale) => sale.total));

        return {
          id: session.id,
          dailyDate: session.dailyDate,
          status: session.status,
          openedBy: session.openedByUser.name,
          openedAt: session.openedAt,
          closedAt: session.closedAt,
          openingAmount,
          cashReceipts,
          cashIn,
          cashOut,
          expectedAmount,
          closingAmount,
          difference,
          totalSales,
          salesCount: session.sales.length,
        };
      }),
      paymentMethodOrder: ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"] satisfies PaymentMethod[],
    };
  }
}
