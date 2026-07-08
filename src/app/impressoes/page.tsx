import { requireAuthContext } from "@/server/auth/context";
import { printService } from "@/server/printing";
import { can } from "@/server/rbac/permissions";

import { processPrintQueueAction, retryPrintAction } from "./actions";

const statusStyle = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PRINTED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  STUCK: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
} as const;

export default async function PrintQueuePage() {
  const [jobs, ctx] = await Promise.all([printService.listQueue(), requireAuthContext()]);
  const canManage = can(ctx.role, "MANAGE_PRINT_QUEUE");
  const visibleJobs = ctx.role === "GARCOM" || ctx.role === "WAITER"
    ? jobs.filter((job) => job.documentType === "COMMAND")
    : jobs;
  const failures = visibleJobs.filter((job) => job.status === "FAILED" || job.status === "STUCK");

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Operação</p><h1 className="mt-2 text-3xl font-semibold">Fila de impressão</h1></div>
        {canManage ? <form action={processPrintQueueAction}><button className="rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white">Processar fila</button></form> : null}
      </div>

      {failures.length > 0 ? (
        <section className="mt-7 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900">
          <h2 className="font-semibold">{failures.length} falha(s) precisam de atenção</h2>
          <p className="mt-1 text-sm">O pedido continua salvo. Verifique o agente ou a impressora e reenvie o job.</p>
        </section>
      ) : null}

      <section className="mt-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-stone-100 text-zinc-600"><tr><th className="p-4">Criado</th><th className="p-4">Documento</th><th className="p-4">Setor</th><th className="p-4">Status</th><th className="p-4">Tentativas</th><th className="p-4">Falha</th><th className="p-4">Ação</th></tr></thead>
            <tbody className="divide-y">
              {visibleJobs.map((job) => (
                <tr key={job.id}>
                  <td className="p-4">{job.createdAt.toLocaleString("pt-BR")}</td>
                  <td className="p-4"><strong>{job.documentType === "COMMAND" ? "Comanda" : "Cupom"}</strong><br /><span className="text-xs text-zinc-500">{job.orderId}</span></td>
                  <td className="p-4">{job.sector}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[job.status]}`}>{job.status}</span></td>
                  <td className="p-4">{job.attempts}/{job.maxAttempts}</td>
                  <td className="max-w-xs p-4 text-red-700">{job.lastError ?? "—"}</td>
                  <td className="p-4">
                    {canManage && (job.status === "FAILED" || job.status === "STUCK") ? (
                      <form action={retryPrintAction.bind(null, job.id)}><button className="rounded-lg border border-zinc-400 px-3 py-2 font-medium">Reenviar</button></form>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {visibleJobs.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Nenhuma comanda na fila.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
