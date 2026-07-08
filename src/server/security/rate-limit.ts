import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

type DuplicateEntry = {
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();
const duplicateEntries = new Map<string, DuplicateEntry>();

function now() {
  return Date.now();
}

function cleanup(map: Map<string, { expiresAt?: number; resetAt?: number }>) {
  const current = now();
  for (const [key, value] of map.entries()) {
    const expiresAt = value.expiresAt ?? value.resetAt ?? 0;
    if (expiresAt <= current) map.delete(key);
  }
}

export async function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  cleanup(buckets);
  const current = now();
  const bucket = buckets.get(input.key);

  if (!bucket || bucket.resetAt <= current) {
    buckets.set(input.key, { count: 1, resetAt: current + input.windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > input.limit) {
    throw new Error(input.message ?? "Muitas tentativas. Aguarde alguns instantes.");
  }
}

export async function preventDuplicateAction(input: {
  key: string;
  ttlMs?: number;
  message?: string;
}) {
  cleanup(duplicateEntries);
  const current = now();
  const existing = duplicateEntries.get(input.key);
  if (existing && existing.expiresAt > current) {
    throw new Error(input.message ?? "Ação duplicada detectada. Aguarde a conclusão da primeira tentativa.");
  }

  duplicateEntries.set(input.key, { expiresAt: current + (input.ttlMs ?? 5_000) });
}

export function clearDuplicateAction(key: string) {
  duplicateEntries.delete(key);
}
