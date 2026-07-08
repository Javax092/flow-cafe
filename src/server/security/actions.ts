import "server-only";

import { headers } from "next/headers";

import { requireAuthContext } from "@/server/auth/context";
import { clientAddress } from "@/server/security/request";

import {
  clearDuplicateAction,
  enforceRateLimit,
  preventDuplicateAction,
} from "./rate-limit";

export async function guardAuthenticatedAction(input: {
  action: string;
  rateLimit?: { limit: number; windowMs: number };
  duplicateKey?: string;
  duplicateTtlMs?: number;
}) {
  const [ctx, requestHeaders] = await Promise.all([requireAuthContext(), headers()]);
  const actor = `${ctx.businessId}:${ctx.userId}`;
  const ip = clientAddress(requestHeaders);
  const rateKey = `action:${input.action}:${actor}:${ip}`;
  const duplicateKey = input.duplicateKey
    ? `duplicate:${input.action}:${actor}:${input.duplicateKey}`
    : null;

  await enforceRateLimit({
    key: rateKey,
    limit: input.rateLimit?.limit ?? 30,
    windowMs: input.rateLimit?.windowMs ?? 60_000,
  });

  if (duplicateKey) {
    await preventDuplicateAction({
      key: duplicateKey,
      ttlMs: input.duplicateTtlMs,
    });
  }

  return {
    ctx,
    releaseDuplicate: () => {
      if (duplicateKey) clearDuplicateAction(duplicateKey);
    },
  };
}
