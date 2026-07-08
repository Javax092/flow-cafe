import "server-only";

import { APP } from "@/config/constants";
import { env } from "@/config/env";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";

function operationalDay() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${value.year}-${value.month}-${value.day}`;
  // America/Manaus uses UTC-04:00 and has no daylight-saving transitions.
  const start = new Date(`${date}T00:00:00-04:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { date, start, end };
}

export class DashboardService {
  async getOperationDashboard() {
    const ctx = await requirePermission("VIEW_OPERATION_DASHBOARD");
    const day = operationalDay();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const [
      sales,
      tabOrders,
      openTabs,
      pendingOrders,
      paymentTotals,
      openCash,
      failedPrints,
      delayedPrints,
      oldOpenTabs,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: { businessId: ctx.businessId, dailyDate: day.date, status: "COMPLETED" },
        include: { items: true, payments: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tabOrder.findMany({
        where: { businessId: ctx.businessId, createdAt: { gte: day.start, lt: day.end } },
        include: {
          tab: { include: { currentTable: { select: { name: true } } } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tab.count({ where: { businessId: ctx.businessId, status: "OPEN" } }),
      prisma.tabOrder.count({ where: { businessId: ctx.businessId, tab: { status: "OPEN" } } }),
      prisma.payment.groupBy({
        by: ["method"],
        where: {
          businessId: ctx.businessId,
          sale: { dailyDate: day.date, status: "COMPLETED" },
        },
        _sum: { amount: true },
      }),
      prisma.cashSession.findFirst({
        where: { businessId: ctx.businessId, status: "OPEN" },
        select: { id: true, openedAt: true },
      }),
      prisma.printJob.count({ where: { businessId: ctx.businessId, status: { in: ["FAILED", "STUCK"] } } }),
      prisma.printJob.count({
        where: {
          businessId: ctx.businessId,
          status: "PENDING",
          createdAt: { lt: fiveMinutesAgo },
        },
      }),
      prisma.tab.count({
        where: { businessId: ctx.businessId, status: "OPEN", openedAt: { lt: fourHoursAgo } },
      }),
    ]);

    const saleTotal = sales.reduce((total, sale) => total + Number(sale.total), 0);
    const alerts: { level: "warning" | "critical"; message: string; href: string }[] = [];
    if (!openCash) alerts.push({ level: "critical", message: "Caixa fechado: novas vendas serão bloqueadas.", href: "/caixa" });
    if (failedPrints > 0) alerts.push({ level: "critical", message: `${failedPrints} impressão(ões) com falha.`, href: "/impressoes" });
    if (delayedPrints > 0) alerts.push({ level: "warning", message: `${delayedPrints} impressão(ões) pendente(s) há mais de 5 minutos.`, href: "/impressoes" });
    if (oldOpenTabs > 0) alerts.push({ level: "warning", message: `${oldOpenTabs} comanda(s) aberta(s) há mais de 4 horas.`, href: "/mesas" });
    if (!env.PRINT_WEBHOOK_URL) alerts.push({ level: "warning", message: "Agente de impressão não configurado.", href: "/impressoes" });

    const recentOrders = [
      ...sales.map((sale) => ({
        id: sale.id,
        type: "Venda" as const,
        reference: `${sale.items.length} item(ns)`,
        total: Number(sale.total),
        createdAt: sale.createdAt,
        pending: false,
      })),
      ...tabOrders.map((order) => ({
        id: order.id,
        type: "Comanda" as const,
        reference: order.tab.currentTable.name,
        total: order.items.reduce((total, item) => total + Number(item.subtotal), 0),
        createdAt: order.createdAt,
        pending: order.tab.status === "OPEN",
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 12);

    return {
      date: day.date,
      generatedAt: new Date(),
      salesCount: sales.length,
      tabOrdersCount: tabOrders.length,
      ordersToday: sales.length + tabOrders.length,
      openTables: openTabs,
      pendingOrders,
      saleTotal,
      paymentTotals: paymentTotals.map((item) => ({
        method: item.method,
        amount: Number(item._sum.amount ?? 0),
      })),
      alerts,
      recentOrders,
      cashOpen: Boolean(openCash),
    };
  }
}
