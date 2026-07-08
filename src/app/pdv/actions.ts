"use server";

import { z } from "zod";

import { guardAuthenticatedAction } from "@/server/security/actions";
import { idSchema, moneyCentsSchema, optionalTextSchema } from "@/server/security/validation";
import { SaleService } from "@/server/services/sale.service";

const saleService = new SaleService();

const cartSchema = z.array(z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(99),
  observation: optionalTextSchema(200),
})).min(1).max(100);

const paymentSchema = z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"]);

export type SaleActionState = {
  success: boolean;
  message?: string;
  saleId?: string;
};

function moneyToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return 0;
  return moneyCentsSchema.parse(value);
}

export async function createSaleAction(
  _state: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  try {
    const rawCart = formData.get("cart");
    if (typeof rawCart !== "string") throw new Error("Carrinho inválido.");

    const items = cartSchema.parse(JSON.parse(rawCart));
    const paymentMethod = paymentSchema.parse(formData.get("paymentMethod"));
    const notes = optionalTextSchema(500).parse(formData.get("notes"));
    await guardAuthenticatedAction({
      action: "sale:create",
      rateLimit: { limit: 20, windowMs: 60_000 },
      duplicateKey: `${paymentMethod}:${moneyToCents(formData.get("discount"))}:${JSON.stringify(items)}`,
      duplicateTtlMs: 8_000,
    });

    const sale = await saleService.createSale({
      items,
      paymentMethod,
      discountCents: moneyToCents(formData.get("discount")),
      notes,
    });

    return {
      success: true,
      saleId: sale.id,
      message: `Venda ${sale.id} criada com sucesso.`,
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return { success: false, message: "Confira os dados do carrinho e tente novamente." };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Não foi possível criar a venda.",
    };
  }
}
