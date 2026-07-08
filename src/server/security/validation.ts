import "server-only";

import { z } from "zod";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const TAG_CHARS = /[<>]/g;

export function sanitizeText(value: string) {
  return value
    .replace(CONTROL_CHARS, " ")
    .replace(TAG_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const idSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);

export function textSchema(min: number, max: number) {
  return z.string().transform(sanitizeText).pipe(z.string().min(min).max(max));
}

export function optionalTextSchema(max: number) {
  return z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value : undefined,
    z.string().transform(sanitizeText).pipe(z.string().max(max)).optional(),
  );
}

export const moneyCentsSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim().replace(",", ".") : value,
  z.string()
    .regex(/^\d+(?:\.\d{1,2})?$/)
    .transform((value) => {
      const [whole, fraction = ""] = value.split(".");
      return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    }),
);

export const positiveMoneySchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim().replace(",", ".") : value,
  z.coerce.number().positive().max(999_999.99),
);
