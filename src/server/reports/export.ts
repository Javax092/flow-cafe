import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import type { ReportMode } from "@/server/services/report.service";

type Report = Awaited<ReturnType<import("@/server/services/report.service").ReportService["getReport"]>>;

const paymentNames = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Credito",
  DEBIT_CARD: "Debito",
} as const;

function fileDate(value: string) {
  return value.replaceAll("-", "");
}

export function reportFileName(report: Report, extension: "csv" | "pdf") {
  const type = report.mode === "monthly" ? "mensal" : "diario";
  return `relatorio-${type}-${fileDate(report.period.from)}-${fileDate(report.period.to)}.${extension}`;
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(";");
}

function money(value: number | string | { toString(): string } | null | undefined) {
  if (value == null) return "";
  return Number(value.toString()).toFixed(2).replace(".", ",");
}

export function buildReportCsv(report: Report) {
  const rows: string[] = [
    csvRow(["Relatorio", report.mode === "monthly" ? "Mensal" : "Diario"]),
    csvRow(["Periodo", report.period.from, report.period.to]),
    csvRow(["Gerado em", report.generatedAt.toISOString()]),
    "",
    csvRow(["Resumo"]),
    csvRow(["Subtotal", money(report.summary.subtotal)]),
    csvRow(["Descontos", money(report.summary.discount)]),
    csvRow(["Faturamento liquido", money(report.summary.revenue)]),
    csvRow(["CMV", money(report.summary.cost)]),
    csvRow(["Margem bruta", money(report.summary.grossMargin)]),
    csvRow(["Margem bruta %", report.summary.grossMarginPercent.toFixed(2).replace(".", ",")]),
    csvRow(["Vendas concluidas", report.summary.salesCount]),
    csvRow(["Ticket medio", money(report.summary.averageTicket)]),
    csvRow(["Vendas canceladas", report.summary.cancelledSalesCount]),
    csvRow(["Total cancelado", money(report.summary.cancelledTotal)]),
    "",
    csvRow(["Pagamentos", "Quantidade", "Valor"]),
    ...report.paymentMethodOrder.map((method) => {
      const payment = report.paymentTotals.find((item) => item.method === method);
      return csvRow([paymentNames[method], payment?.count ?? 0, money(payment?.amount ?? 0)]);
    }),
    "",
    csvRow(["Fechamento por caixa", "Data", "Status", "Operador abertura", "Abertura", "Dinheiro vendas", "Suprimentos", "Sangrias", "Esperado", "Contado", "Diferenca", "Vendas", "Qtd vendas"]),
    ...report.cashClosures.map((cash) => csvRow([
      cash.id,
      cash.dailyDate,
      cash.status,
      cash.openedBy,
      money(cash.openingAmount),
      money(cash.cashReceipts),
      money(cash.cashIn),
      money(cash.cashOut),
      money(cash.expectedAmount),
      money(cash.closingAmount),
      money(cash.difference),
      money(cash.totalSales),
      cash.salesCount,
    ])),
    "",
    csvRow(["Fechamento por operador", "Vendas", "Faturamento", "Descontos", "CMV", "Margem", "Ticket medio"]),
    ...report.operators.map((operator) => csvRow([
      operator.name,
      operator.salesCount,
      money(operator.revenue),
      money(operator.discount),
      money(operator.cost),
      money(operator.grossMargin),
      money(operator.averageTicket),
    ])),
    "",
    csvRow(["Produtos", "Categoria", "Quantidade", "Faturamento", "CMV", "Margem"]),
    ...report.products.map((product) => csvRow([
      product.name,
      product.category,
      product.quantity,
      money(product.revenue),
      money(product.cost),
      money(product.grossMargin),
    ])),
    "",
    csvRow(["Categorias", "Quantidade", "Faturamento", "CMV", "Margem"]),
    ...report.categories.map((category) => csvRow([
      category.name,
      category.quantity,
      money(category.revenue),
      money(category.cost),
      money(category.grossMargin),
    ])),
    "",
    csvRow(["Vendas por dia", "Qtd vendas", "Faturamento", "Descontos", "CMV", "Margem"]),
    ...report.dailySales.map((day) => csvRow([
      day.date,
      day.salesCount,
      money(day.revenue),
      money(day.discount),
      money(day.cost),
      money(day.grossMargin),
    ])),
  ];

  return `\uFEFF${rows.join("\n")}\n`;
}

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function pdfLines(report: Report) {
  const title = report.mode === "monthly" ? "Relatorio mensal" : "Relatorio diario";
  const lines = [
    `${title} - Flow Cafe`,
    `Periodo: ${report.period.from} a ${report.period.to}`,
    `Gerado em: ${formatDate(report.generatedAt, { dateStyle: "short", timeStyle: "short" })}`,
    "",
    `Faturamento: ${formatCurrency(report.summary.revenue)} | Vendas: ${report.summary.salesCount} | Ticket medio: ${formatCurrency(report.summary.averageTicket)}`,
    `Subtotal: ${formatCurrency(report.summary.subtotal)} | Descontos: ${formatCurrency(report.summary.discount)} | CMV: ${formatCurrency(report.summary.cost)}`,
    `Margem bruta: ${formatCurrency(report.summary.grossMargin)} (${report.summary.grossMarginPercent.toFixed(1)}%)`,
    `Canceladas: ${report.summary.cancelledSalesCount} | Total cancelado: ${formatCurrency(report.summary.cancelledTotal)}`,
    "",
    "Pagamentos",
    ...report.paymentMethodOrder.map((method) => {
      const payment = report.paymentTotals.find((item) => item.method === method);
      return `- ${paymentNames[method]}: ${formatCurrency(payment?.amount ?? 0)} (${payment?.count ?? 0})`;
    }),
    "",
    "Fechamento por caixa",
    ...report.cashClosures.slice(0, 12).map((cash) => (
      `${cash.dailyDate} ${cash.status} ${cash.openedBy} | esperado ${formatCurrency(cash.expectedAmount)} | contado ${cash.closingAmount == null ? "em aberto" : formatCurrency(cash.closingAmount)} | dif. ${cash.difference == null ? "em aberto" : formatCurrency(cash.difference)}`
    )),
    report.cashClosures.length > 12 ? `... mais ${report.cashClosures.length - 12} caixas no CSV` : "",
    "",
    "Fechamento por operador",
    ...report.operators.slice(0, 12).map((operator) => (
      `${operator.name}: ${operator.salesCount} vendas | ${formatCurrency(operator.revenue)} | ticket ${formatCurrency(operator.averageTicket)}`
    )),
    report.operators.length > 12 ? `... mais ${report.operators.length - 12} operadores no CSV` : "",
    "",
    "Produtos",
    ...report.products.slice(0, 18).map((product) => (
      `${product.name} (${product.category}): ${product.quantity} un | ${formatCurrency(product.revenue)}`
    )),
    report.products.length > 18 ? `... mais ${report.products.length - 18} produtos no CSV` : "",
    "",
    "Categorias",
    ...report.categories.slice(0, 12).map((category) => (
      `${category.name}: ${category.quantity} un | ${formatCurrency(category.revenue)} | margem ${formatCurrency(category.grossMargin)}`
    )),
  ];
  return lines.filter((line) => line.length > 0);
}

function makeContent(lines: string[]) {
  return lines.map((line, index) => {
    const size = index === 0 ? 16 : 10;
    const y = 790 - index * 16;
    return `BT /F1 ${size} Tf 48 ${y} Td (${escapePdfText(line.slice(0, 112))}) Tj ET`;
  }).join("\n");
}

export function buildReportPdf(report: Report) {
  const pages = [];
  const lines = pdfLines(report);
  for (let index = 0; index < lines.length; index += 45) {
    pages.push(lines.slice(index, index + 45));
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((pageLines, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const content = makeContent(pageLines);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}

export function reportLabel(mode: ReportMode) {
  return mode === "monthly" ? "Relatorio mensal" : "Relatorio diario";
}
