import { APP } from "@/config/constants";

export type CurrencyValue = number | string;

export function formatCurrency(value: CurrencyValue): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    throw new TypeError("O valor monetário deve ser um número finito.");
  }

  return new Intl.NumberFormat(APP.locale, {
    style: "currency",
    currency: APP.currency,
  }).format(amount);
}
