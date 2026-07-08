import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { printService } from "@/server/printing";
import { requirePermission } from "@/server/rbac/permissions";

type LockedTab = {
  id: string;
  businessId: string;
  currentTableId: string;
  status: "OPEN" | "CLOSED";
};

function cents(value: { toString(): string }) {
  const [whole, decimal = ""] = value.toString().split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0").slice(0, 2));
}

function decimal(value: number) {
  return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

async function lockTab(
  tx: Prisma.TransactionClient,
  businessId: string,
  tabId: string,
) {
  const tabs = await tx.$queryRaw<LockedTab[]>`
    SELECT "id", "businessId", "currentTableId", "status"
    FROM "Tab"
    WHERE "id" = ${tabId} AND "businessId" = ${businessId}
    FOR UPDATE
  `;
  const tab = tabs[0];
  if (!tab) throw new Error("Comanda não encontrada.");
  if (tab.status !== "OPEN") throw new Error("A comanda está fechada e não aceita alterações.");
  return tab;
}

export class TabService {
  async listTablesAndHistory() {
    const ctx = await requirePermission("MANAGE_TABS");
    const [tables, recentClosedTabs] = await Promise.all([
      prisma.diningTable.findMany({
        where: { businessId: ctx.businessId, isActive: true },
        include: {
          tabs: {
            where: { status: "OPEN" },
            include: {
              orders: {
                include: { items: true, createdBy: { select: { name: true } } },
                orderBy: { createdAt: "asc" },
              },
              transfers: {
                include: { fromTable: true, toTable: true },
                orderBy: { createdAt: "asc" },
              },
            },
            take: 1,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.tab.findMany({
        where: { businessId: ctx.businessId, status: "CLOSED" },
        include: {
          currentTable: true,
          openedBy: { select: { name: true } },
          closedBy: { select: { name: true } },
          orders: { include: { items: true }, orderBy: { createdAt: "asc" } },
          transfers: {
            include: { fromTable: true, toTable: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { closedAt: "desc" },
        take: 20,
      }),
    ]);
    return { tables, recentClosedTabs };
  }

  async createTable(name: string, sortOrder: number) {
    const ctx = await requirePermission("CONFIGURE_TABLES");
    return prisma.diningTable.create({
      data: { businessId: ctx.businessId, name, sortOrder },
    });
  }

  async openTab(tableId: string, customerName?: string) {
    const ctx = await requirePermission("MANAGE_TABS");
    const table = await prisma.diningTable.findFirst({
      where: { id: tableId, businessId: ctx.businessId, isActive: true },
      select: { id: true },
    });
    if (!table) throw new Error("Mesa inválida.");

    return prisma.tab.create({
      data: {
        businessId: ctx.businessId,
        currentTableId: table.id,
        openedByUserId: ctx.userId,
        customerName,
      },
    });
  }

  async addOrder(tabId: string, input: {
    productId: string;
    quantity: number;
    observation?: string;
  }) {
    const ctx = await requirePermission("MANAGE_TABS");
    return prisma.$transaction(async (tx) => {
      const tab = await lockTab(tx, ctx.businessId, tabId);
      const product = await tx.product.findFirst({
        where: {
          id: input.productId,
          businessId: ctx.businessId,
          status: "ACTIVE",
          OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
        },
        select: {
          id: true,
          name: true,
          price: true,
          category: { select: { printSector: true } },
        },
      });
      if (!product) throw new Error("Produto indisponível.");

      const unitPriceCents = cents(product.price);
      const order = await tx.tabOrder.create({
        data: {
          businessId: ctx.businessId,
          tabId: tab.id,
          createdByUserId: ctx.userId,
          items: {
            create: {
              businessId: ctx.businessId,
              productId: product.id,
              productNameSnapshot: product.name,
              unitPriceSnapshot: decimal(unitPriceCents),
              quantity: input.quantity,
              subtotal: decimal(unitPriceCents * input.quantity),
              observation: input.observation,
            },
          },
        },
        include: { items: true },
      });
      const sector = product.category?.printSector ?? "GERAL";
      await printService.enqueueOrderPrint({
        businessId: ctx.businessId,
        orderId: order.id,
        documentType: "COMMAND",
        sector,
        printerName: sector,
        payload: {
          type: "COMMAND",
          tabId: tab.id,
          tableId: tab.currentTableId,
          orderId: order.id,
          sector,
          items: order.items.map((item) => ({
            name: item.productNameSnapshot,
            quantity: item.quantity,
            observation: item.observation,
          })),
          createdAt: order.createdAt.toISOString(),
        },
      }, tx);
      return order;
    });
  }

  async transferTab(tabId: string, destinationTableId: string) {
    const ctx = await requirePermission("MANAGE_TABS");
    return prisma.$transaction(async (tx) => {
      const tab = await lockTab(tx, ctx.businessId, tabId);
      if (tab.currentTableId === destinationTableId) throw new Error("Selecione outra mesa.");

      const destination = await tx.diningTable.findFirst({
        where: { id: destinationTableId, businessId: ctx.businessId, isActive: true },
        select: { id: true },
      });
      if (!destination) throw new Error("Mesa de destino inválida.");
      const occupied = await tx.tab.findFirst({
        where: { currentTableId: destination.id, status: "OPEN" },
        select: { id: true },
      });
      if (occupied) throw new Error("A mesa de destino já possui uma comanda aberta.");

      await tx.tabTransfer.create({
        data: {
          businessId: ctx.businessId,
          tabId: tab.id,
          fromTableId: tab.currentTableId,
          toTableId: destination.id,
          transferredByUserId: ctx.userId,
        },
      });
      return tx.tab.update({
        where: { id: tab.id },
        data: { currentTableId: destination.id },
      });
    });
  }

  async closeTab(tabId: string) {
    const ctx = await requirePermission("MANAGE_TABS");
    return prisma.$transaction(async (tx) => {
      const tab = await lockTab(tx, ctx.businessId, tabId);
      return tx.tab.update({
        where: { id: tab.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByUserId: ctx.userId,
        },
      });
    });
  }
}
