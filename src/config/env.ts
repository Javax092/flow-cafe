import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL deve ser uma URL PostgreSQL",
    ),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PRINT_WEBHOOK_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
});

const parsedEnv = serverEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const fields = parsedEnv.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  throw new Error(`Variáveis de ambiente inválidas: ${fields}`);
}

export const env = Object.freeze(parsedEnv.data);
