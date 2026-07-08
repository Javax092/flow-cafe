import "server-only";

import { APP } from "@/config/constants";
import { requirePermission } from "@/server/rbac/permissions";
import { CashRepository } from "@/server/repositories/cash.repository";

const cashRepository = new CashRepository();

function decimal(cents: number) {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function dailyDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export class CashService {
  async getDashboard() {
    const ctx = await requirePermission("VIEW_CASH");
    return cashRepository.getDashboard(ctx.businessId);
  }

  async openCashSession(input: { openingAmountCents: number; notes?: string }) {
    const ctx = await requirePermission("OPEN_CASH_SESSION");
    if (input.openingAmountCents < 0) throw new Error("O valor de abertura não pode ser negativo.");
    return cashRepository.openSession({
      businessId: ctx.businessId,
      userId: ctx.userId,
      dailyDate: dailyDate(),
      openingAmount: decimal(input.openingAmountCents),
      notes: input.notes,
    });
  }

  async closeCashSession(input: { closingAmountCents: number; notes?: string }) {
    const ctx = await requirePermission("CLOSE_CASH_SESSION");
    if (input.closingAmountCents < 0) throw new Error("O valor contado não pode ser negativo.");
    const session = await cashRepository.findOpenSession(ctx.businessId);
    if (!session) throw new Error("Não existe caixa aberto para fechamento.");
    return cashRepository.closeSession({
      businessId: ctx.businessId,
      cashSessionId: session.id,
      closedByUserId: ctx.userId,
      closingAmountCents: input.closingAmountCents,
      notes: input.notes,
    });
  }

  async addCashIn(input: { amountCents: number; reason: string }) {
    return this.addMovement("CASH_IN", input);
  }

  async addCashOut(input: { amountCents: number; reason: string }) {
    return this.addMovement("CASH_OUT", input);
  }

  private async addMovement(type: "CASH_IN" | "CASH_OUT", input: { amountCents: number; reason: string }) {
    const ctx = await requirePermission("REGISTER_CASH_MOVEMENT");
    if (input.amountCents <= 0) throw new Error("O valor deve ser maior que zero.");
    if (!input.reason.trim()) throw new Error("A movimentação exige justificativa.");
    const session = await cashRepository.findOpenSession(ctx.businessId);
    if (!session) throw new Error("Não existe caixa aberto.");
    return cashRepository.addMovement({
      businessId: ctx.businessId,
      cashSessionId: session.id,
      userId: ctx.userId,
      type,
      amount: decimal(input.amountCents),
      reason: input.reason.trim(),
    });
  }
}
