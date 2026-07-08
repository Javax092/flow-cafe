"use server";

import { revalidatePath } from "next/cache";

import { guardAuthenticatedAction } from "@/server/security/actions";
import { moneyCentsSchema, optionalTextSchema, textSchema } from "@/server/security/validation";
import { CashService } from "@/server/services/cash.service";

const service = new CashService();

function moneyToCents(value: FormDataEntryValue | null) {
  return moneyCentsSchema.parse(value);
}

function optionalNotes(formData: FormData) {
  return optionalTextSchema(500).parse(formData.get("notes"));
}

export async function openCashAction(formData: FormData) {
  const amount = moneyToCents(formData.get("amount"));
  await guardAuthenticatedAction({
    action: "cash:open",
    rateLimit: { limit: 6, windowMs: 60_000 },
    duplicateKey: String(amount),
    duplicateTtlMs: 10_000,
  });
  await service.openCashSession({
    openingAmountCents: amount,
    notes: optionalNotes(formData),
  });
  revalidatePath("/caixa");
}

export async function closeCashAction(formData: FormData) {
  const amount = moneyToCents(formData.get("amount"));
  await guardAuthenticatedAction({
    action: "cash:close",
    rateLimit: { limit: 6, windowMs: 60_000 },
    duplicateKey: String(amount),
    duplicateTtlMs: 10_000,
  });
  await service.closeCashSession({
    closingAmountCents: amount,
    notes: optionalNotes(formData),
  });
  revalidatePath("/caixa");
}

async function movement(formData: FormData, type: "IN" | "OUT") {
  const reason = textSchema(3, 200).parse(formData.get("reason"));
  const input = { amountCents: moneyToCents(formData.get("amount")), reason };
  await guardAuthenticatedAction({
    action: type === "IN" ? "cash:supply" : "cash:withdrawal",
    rateLimit: { limit: 12, windowMs: 60_000 },
    duplicateKey: `${input.amountCents}:${reason}`,
    duplicateTtlMs: 8_000,
  });
  if (type === "IN") await service.addCashIn(input);
  else await service.addCashOut(input);
  revalidatePath("/caixa");
}

export async function addSupplyAction(formData: FormData) {
  await movement(formData, "IN");
}

export async function addWithdrawalAction(formData: FormData) {
  await movement(formData, "OUT");
}
