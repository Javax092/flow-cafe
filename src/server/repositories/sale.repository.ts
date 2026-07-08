import { prisma } from "@/server/db/prisma";
import { appendAuditLog } from "@/server/audit/audit.service";
import {
  consumeStockForSale,
  reverseStockForSale,
} from "@/server/inventory/stock-consumption";
import { printService } from "@/server/printing";
import { Prisma, type PaymentMethod } from "@prisma/client";

type CreateSaleItemInput = {
  productId?: string;
  productNameSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  subtotal: string;
  observation?: string;
};

type CreatePaymentInput = {
  method: PaymentMethod;
  amount: string;
};

export class SaleRepository {
  async findOpenCashSession(businessId: string) {
    return prisma.cashSession.findFirst({
      where: {
        businessId,
        status: "OPEN",
      },
      orderBy: {
        openedAt: "desc",
      },
    });
  }

  async createSale(data: {
    businessId: string;
    userId: string;
    cashSessionId: string;
    dailyDate: string;
    subtotal: string;
    discount: string;
    total: string;
    notes?: string;
    items: CreateSaleItemInput[];
    payments: CreatePaymentInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      const openCash = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "CashSession"
        WHERE "id" = ${data.cashSessionId}
          AND "businessId" = ${data.businessId}
          AND "status" = 'OPEN'
        FOR SHARE
      `;
      if (!openCash[0]) {
        throw new Error("O caixa está fechado. A venda não foi registrada.");
      }

      const createdSale = await tx.sale.create({
        data: {
          businessId: data.businessId,
          userId: data.userId,
          cashSessionId: data.cashSessionId,
          dailyDate: data.dailyDate,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              businessId: data.businessId,
              productId: item.productId,
              productNameSnapshot: item.productNameSnapshot,
              unitPriceSnapshot: item.unitPriceSnapshot,
              quantity: item.quantity,
              subtotal: item.subtotal,
              observation: item.observation,
            })),
          },
          payments: {
            create: data.payments.map((payment) => ({
              businessId: data.businessId,
              method: payment.method,
              amount: payment.amount,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      const costs = await consumeStockForSale(tx, {
        businessId: data.businessId,
        userId: data.userId,
        saleId: createdSale.id,
        items: data.items,
      });
      let costTotal = new Prisma.Decimal(0);
      for (const item of createdSale.items) {
        if (!item.productId) continue;
        const itemCost = costs.get(item.productId) ?? new Prisma.Decimal(0);
        costTotal = costTotal.add(itemCost);
        await tx.saleItem.update({
          where: { id: item.id },
          data: { costSubtotal: itemCost },
        });
      }
      const sale = await tx.sale.update({
        where: { id: createdSale.id },
        data: { costTotal },
        include: { items: true, payments: true },
      });

      await printService.enqueueOrderPrint(
        {
          businessId: data.businessId,
          orderId: sale.id,
          documentType: "RECEIPT",
          sector: "CAIXA",
          printerName: "CAIXA",
          payload: {
            type: "SALE_RECEIPT",
            saleId: sale.id,
            dailyDate: sale.dailyDate,
            subtotal: sale.subtotal,
            discount: sale.discount,
            total: sale.total,
            notes: sale.notes,
            items: sale.items.map((item) => ({
              name: item.productNameSnapshot,
              quantity: item.quantity,
              unitPrice: item.unitPriceSnapshot,
              subtotal: item.subtotal,
              observation: item.observation,
            })),
            payments: sale.payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
            })),
            createdAt: sale.createdAt.toISOString(),
          },
        },
        tx,
      );

      await appendAuditLog({
        businessId: data.businessId,
        userId: data.userId,
        action: "SALE_CREATED",
        entity: "Sale",
        entityId: sale.id,
        after: {
          status: sale.status,
          subtotal: sale.subtotal.toString(),
          discount: sale.discount.toString(),
          total: sale.total.toString(),
          costTotal: sale.costTotal.toString(),
          cashSessionId: sale.cashSessionId,
          payments: sale.payments.map((payment) => ({
            method: payment.method,
            amount: payment.amount.toString(),
          })),
        },
      }, tx);

      return sale;
    });
  }

  async cancelSale(data: {
    businessId: string;
    userId: string;
    saleId: string;
    reason: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Sale"
        WHERE "id" = ${data.saleId} AND "businessId" = ${data.businessId}
        FOR UPDATE
      `;
      if (!locked[0]) throw new Error("Venda não encontrada.");

      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: data.saleId },
        include: { payments: true },
      });
      if (sale.status !== "COMPLETED") throw new Error("A venda já foi cancelada.");

      const cash = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "CashSession"
        WHERE "id" = ${sale.cashSessionId} AND "status" = 'OPEN'
        FOR SHARE
      `;
      if (!cash[0]) throw new Error("Não é permitido cancelar venda de um caixa fechado.");

      await reverseStockForSale(tx, {
        businessId: data.businessId,
        userId: data.userId,
        saleId: sale.id,
      });

      const cancelled = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "CANCELLED",
          cancelReason: data.reason,
          cancelledAt: new Date(),
        },
      });
      await appendAuditLog({
        businessId: data.businessId,
        userId: data.userId,
        action: "SALE_CANCELLED",
        entity: "Sale",
        entityId: sale.id,
        reason: data.reason,
        before: {
          status: sale.status,
          total: sale.total.toString(),
          cancelledAt: null,
          cancelReason: null,
        },
        after: {
          status: cancelled.status,
          total: cancelled.total.toString(),
          cancelledAt: cancelled.cancelledAt?.toISOString() ?? null,
          cancelReason: cancelled.cancelReason,
        },
      }, tx);
      return cancelled;
    });
  }

  async findById(businessId: string, saleId: string) {
    return prisma.sale.findFirst({
      where: {
        id: saleId,
        businessId,
      },
      include: {
        items: true,
        payments: true,
      },
    });
  }

  async findSalesByDate(businessId: string, dailyDate: string) {
    return prisma.sale.findMany({
      where: {
        businessId,
        dailyDate,
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
