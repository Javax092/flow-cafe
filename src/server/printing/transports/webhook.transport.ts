import "server-only";

import { env } from "@/config/env";
import type { PrintTransport } from "../types";

export class WebhookPrintTransport implements PrintTransport {
  async print(job: Parameters<PrintTransport["print"]>[0]) {
    if (!env.PRINT_WEBHOOK_URL) {
      throw new Error("PRINT_WEBHOOK_URL não configurada para o agente de impressão.");
    }

    const response = await fetch(env.PRINT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        documentType: job.documentType,
        sector: job.sector,
        printerName: job.printerName,
        payload: job.payload,
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Agente de impressão respondeu HTTP ${response.status}.`);
  }
}
