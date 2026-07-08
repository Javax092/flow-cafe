import { z } from "zod";

import {
  buildReportCsv,
  buildReportPdf,
  reportFileName,
} from "@/server/reports/export";
import {
  defaultReportPeriod,
  normalizeReportMode,
  ReportService,
} from "@/server/services/report.service";

const service = new ReportService();

const exportQuerySchema = z.object({
  tipo: z.enum(["daily", "monthly"]).optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  formato: z.enum(["csv", "pdf"]).optional(),
});

function contentDisposition(filename: string) {
  return `attachment; filename="${filename}"`;
}

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsedQuery = exportQuerySchema.safeParse(params);
  if (!parsedQuery.success) {
    return Response.json({ error: "Parâmetros de exportação inválidos." }, { status: 400 });
  }
  const query = parsedQuery.data;
  const mode = normalizeReportMode(query.tipo);
  const defaults = defaultReportPeriod(mode);
  const from = query.de ?? defaults.from;
  const to = query.ate ?? defaults.to;
  const format = query.formato === "pdf" ? "pdf" : "csv";
  const report = await service.getReport({ mode, from, to });

  if (format === "pdf") {
    return new Response(buildReportPdf(report), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": contentDisposition(reportFileName(report, "pdf")),
      },
    });
  }

  return new Response(buildReportCsv(report), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": contentDisposition(reportFileName(report, "csv")),
    },
  });
}
