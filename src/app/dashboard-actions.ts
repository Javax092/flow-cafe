"use server";

import { revalidatePath } from "next/cache";

import { guardAuthenticatedAction } from "@/server/security/actions";
import { idSchema, textSchema } from "@/server/security/validation";
import { SaleService } from "@/server/services/sale.service";

const service = new SaleService();

export async function cancelSaleAction(saleId: string, formData: FormData) {
  const id = idSchema.parse(saleId);
  const reason = textSchema(5, 300).parse(formData.get("reason"));
  await guardAuthenticatedAction({
    action: "sale:cancel",
    rateLimit: { limit: 12, windowMs: 60_000 },
    duplicateKey: `${id}:${reason}`,
    duplicateTtlMs: 10_000,
  });
  await service.cancelSale(id, reason);
  revalidatePath("/");
  revalidatePath("/caixa");
  revalidatePath("/auditoria");
}
