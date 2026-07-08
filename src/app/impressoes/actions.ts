"use server";

import { revalidatePath } from "next/cache";

import { printService } from "@/server/printing";
import { guardAuthenticatedAction } from "@/server/security/actions";
import { idSchema } from "@/server/security/validation";

export async function processPrintQueueAction() {
  await guardAuthenticatedAction({
    action: "print:process",
    rateLimit: { limit: 10, windowMs: 60_000 },
    duplicateKey: "queue",
  });
  await printService.processQueue();
  revalidatePath("/impressoes");
}

export async function retryPrintAction(jobId: string) {
  const parsedId = idSchema.parse(jobId);
  await guardAuthenticatedAction({ action: "print:retry", duplicateKey: parsedId });
  await printService.retry(parsedId);
  revalidatePath("/impressoes");
}
