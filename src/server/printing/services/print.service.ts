import "server-only";

import { requirePermission } from "@/server/rbac/permissions";
import { printRepository } from "../repositories/print.repository";
import { WebhookPrintTransport } from "../transports/webhook.transport";
import type { CreatePrintJobInput, PrintTransactionClient, PrintTransport } from "../types";

export class PrintService {
  async enqueueOrderPrint(data: CreatePrintJobInput, tx?: PrintTransactionClient) {
    const existing = await printRepository.findExisting(data, tx);
    if (existing) return existing;
    return printRepository.create(data, tx);
  }

  async listQueue() {
    const ctx = await requirePermission("VIEW_PRINT_QUEUE");
    return printRepository.listByBusiness(ctx.businessId);
  }

  async retry(jobId: string) {
    const ctx = await requirePermission("MANAGE_PRINT_QUEUE");
    const result = await printRepository.retry(ctx.businessId, jobId);
    if (result.count !== 1) throw new Error("Job não encontrado ou não pode ser reenviado.");
  }

  async processQueue(transport: PrintTransport = new WebhookPrintTransport()) {
    await requirePermission("MANAGE_PRINT_QUEUE");
    await printRepository.recoverStuck(new Date(Date.now() - 5 * 60 * 1000));
    await printRepository.requeueDue();

    const jobs = await printRepository.findPending(20);
    let printed = 0;
    let failed = 0;
    const workerId = `web-${crypto.randomUUID()}`;

    for (const job of jobs) {
      const lock = await printRepository.lockJob(job.id, workerId);
      if (lock.count !== 1) continue;
      try {
        await transport.print(job);
        await printRepository.markPrinted(job.id);
        printed += 1;
      } catch (error) {
        const attempts = job.attempts + 1;
        const nextRetryAt = attempts < job.maxAttempts
          ? new Date(Date.now() + Math.min(60_000, 2 ** attempts * 1_000))
          : undefined;
        const message = error instanceof Error ? error.message : "Falha desconhecida na impressão.";
        await printRepository.markFailed(job.id, message, nextRetryAt);
        failed += 1;
      }
    }
    return { printed, failed };
  }
}

export const printService = new PrintService();
