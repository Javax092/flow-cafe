import "server-only";

import type { PaymentMethod } from "@prisma/client";

import { APP } from "@/config/constants";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";
import { SaleRepository } from "@/server/repositories/sale.repository";

const saleRepository = new SaleRepository();

type CreateSaleInput = {
  discountCents?: number;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: {
    productId: string;
    quantity: number;
    observation?: string;
  }[];
};

function decimalToCents(value: { toString(): string }) {
  const [integer, fraction = ""] = value.toString().split(".");
  return Number(integer) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function centsToDecimal(cents: number) {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function currentDailyDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export class SaleService {
  async createSale(input: CreateSaleInput) {
    const ctx = await requirePermission("CREATE_SALE");

    if (input.items.length === 0) throw new Error("A venda precisa ter pelo menos um item.");

    const discountCents = input.discountCents ?? 0;
    if (discountCents > 0) await requirePermission("APPLY_DISCOUNT");

    const productIds = input.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new Error("O mesmo produto não pode aparecer mais de uma vez no carrinho.");
    }

    const [cashSession, products] = await Promise.all([
      saleRepository.findOpenCashSession(ctx.businessId),
      prisma.product.findMany({
        where: {
          businessId: ctx.businessId,
          id: { in: productIds },
          status: "ACTIVE",
          OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
        },
        select: { id: true, name: true, price: true },
      }),
    ]);

    if (!cashSession) throw new Error("Não existe caixa aberto para registrar esta venda.");
    if (products.length !== productIds.length) {
      throw new Error("Um ou mais produtos não estão disponíveis para venda.");
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const items = input.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new Error("Produto inválido.");

      const unitPriceCents = decimalToCents(product.price);
      return {
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: centsToDecimal(unitPriceCents),
        quantity: item.quantity,
        subtotal: centsToDecimal(unitPriceCents * item.quantity),
        subtotalCents: unitPriceCents * item.quantity,
        observation: item.observation,
      };
    });

    const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    if (discountCents < 0 || discountCents >= subtotalCents) {
      throw new Error("O desconto deve ser menor que o subtotal da venda.");
    }

    const totalCents = subtotalCents - discountCents;
    return saleRepository.createSale({
      businessId: ctx.businessId,
      userId: ctx.userId,
      cashSessionId: cashSession.id,
      dailyDate: currentDailyDate(),
      subtotal: centsToDecimal(subtotalCents),
      discount: centsToDecimal(discountCents),
      total: centsToDecimal(totalCents),
      notes: input.notes,
      items: items.map((item) => ({
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        unitPriceSnapshot: item.unitPriceSnapshot,
        quantity: item.quantity,
        subtotal: item.subtotal,
        observation: item.observation,
      })),
      payments: [{ method: input.paymentMethod, amount: centsToDecimal(totalCents) }],
    });
  }

  async getSaleById(saleId: string) {
    const ctx = await requirePermission("VIEW_SALES");
    return saleRepository.findById(ctx.businessId, saleId);
  }

  async cancelSale(saleId: string, reason: string) {
    const ctx = await requirePermission("CANCEL_SALE");
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      throw new Error("O cancelamento exige motivo com pelo menos 5 caracteres.");
    }
    return saleRepository.cancelSale({
      businessId: ctx.businessId,
      userId: ctx.userId,
      saleId,
      reason: normalizedReason,
    });
  }

  async listSalesByDate(dailyDate: string) {
    const ctx = await requirePermission("VIEW_SALES");
    return saleRepository.findSalesByDate(ctx.businessId, dailyDate);
  }
}
