import "server-only";

import { Prisma } from "@prisma/client";

import { APP } from "@/config/constants";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultManagementPeriod() {
  const to = currentDate();
  return { from: shiftDate(to, -6), to };
}

type TopProductRow = {
  key: string;
  name: string;
  quantity: bigint;
  revenue: Prisma.Decimal;
};

export class ManagementDashboardService {
  async getDashboard(input: { from: string; to: string }) {
    const ctx = await requirePermission("VIEW_REPORTS");
    const fromDate = parseDate(input.from);
    const toDate = parseDate(input.to);
    const durationDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    if (durationDays < 1) throw new Error("A data inicial deve ser anterior à data final.");
    if (durationDays > 366) throw new Error("O período máximo é de 366 dias.");

    const previousTo = shiftDate(input.from, -1);
    const previousFrom = shiftDate(previousTo, -(durationDays - 1));
    const saleFilter = {
      businessId: ctx.businessId,
      status: "COMPLETED" as const,
      dailyDate: { gte: input.from, lte: input.to },
    };

    const [summary, previous, dailySales, paymentTotals, topProducts] = await Promise.all([
      prisma.sale.aggregate({
        where: saleFilter,
        _sum: { total: true, costTotal: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: {
          businessId: ctx.businessId,
          status: "COMPLETED",
          dailyDate: { gte: previousFrom, lte: previousTo },
        },
        _sum: { total: true, costTotal: true },
        _count: { id: true },
      }),
      prisma.sale.groupBy({
        by: ["dailyDate"],
        where: saleFilter,
        _sum: { total: true },
        _count: { id: true },
        orderBy: { dailyDate: "asc" },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { businessId: ctx.businessId, sale: saleFilter },
        _sum: { amount: true },
        orderBy: { method: "asc" },
      }),
      prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
        SELECT
          COALESCE(si."productId", 'snapshot:' || si."productNameSnapshot") AS key,
          MAX(si."productNameSnapshot") AS name,
          SUM(si.quantity)::bigint AS quantity,
          SUM(si.subtotal) AS revenue
        FROM "SaleItem" si
        INNER JOIN "Sale" s ON s.id = si."saleId"
        WHERE si."businessId" = ${ctx.businessId}
          AND s.status = 'COMPLETED'
          AND s."dailyDate" >= ${input.from}
          AND s."dailyDate" <= ${input.to}
        GROUP BY COALESCE(si."productId", 'snapshot:' || si."productNameSnapshot")
        ORDER BY quantity DESC, revenue DESC
        LIMIT 10
      `),
    ]);

    const revenue = Number(summary._sum.total ?? 0);
    const salesCount = summary._count.id;
    const costOfGoods = Number(summary._sum.costTotal ?? 0);
    const previousRevenue = Number(previous._sum.total ?? 0);
    const previousSalesCount = previous._count.id;

    return {
      period: { from: input.from, to: input.to, durationDays },
      previousPeriod: { from: previousFrom, to: previousTo },
      revenue,
      costOfGoods,
      grossMargin: revenue - costOfGoods,
      grossMarginPercent: revenue > 0 ? ((revenue - costOfGoods) / revenue) * 100 : 0,
      salesCount,
      averageTicket: salesCount > 0 ? revenue / salesCount : 0,
      previousRevenue,
      previousSalesCount,
      previousAverageTicket: previousSalesCount > 0 ? previousRevenue / previousSalesCount : 0,
      revenueChangePercent: previousRevenue > 0
        ? ((revenue - previousRevenue) / previousRevenue) * 100
        : null,
      dailySales: dailySales.map((day) => ({
        date: day.dailyDate,
        revenue: Number(day._sum.total ?? 0),
        count: day._count.id,
      })),
      paymentTotals: paymentTotals.map((payment) => ({
        method: payment.method,
        amount: Number(payment._sum.amount ?? 0),
      })),
      topProducts: topProducts.map((product) => ({
        key: product.key,
        name: product.name,
        quantity: Number(product.quantity),
        revenue: Number(product.revenue),
      })),
    };
  }
}
