import { AuditService } from "@/server/audit/audit.service";

export const dynamic = "force-dynamic";

function json(value: unknown) {
  if (value === null || value === undefined) return "—";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(value));
}

export default async function AuditPage() {
  const service = new AuditService();
  const entries = await service.listRecent();

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
          Segurança
        </p>

        <h1 className="mt-2 text-3xl font-semibold">
          Auditoria de negócio
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Visualização somente leitura dos 200 registros mais recentes.
        </p>
      </div>

      <section className="mt-7 space-y-3">
        {entries.length === 0 ? (
          <p className="rounded-2xl border bg-white p-8 text-center text-zinc-500">
            Nenhum evento auditado.
          </p>
        ) : null}

        {entries.map((entry) => (
          <details
            key={entry.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{entry.action}</strong>

                  <p className="mt-1 text-sm text-zinc-500">
                    {entry.entity}
                    {entry.entityId ? ` · ${entry.entityId}` : ""}
                  </p>
                </div>

                <div className="text-right text-sm">
                  <p>{entry.user?.name ?? "Sistema"}</p>

                  <time
                    dateTime={new Date(entry.createdAt).toISOString()}
                    className="text-zinc-500"
                  >
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
              </div>
            </summary>

            <div className="mt-5 grid gap-4 border-t pt-4 lg:grid-cols-2">
              {entry.reason ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 lg:col-span-2">
                  <strong>Motivo:</strong> {entry.reason}
                </p>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold">Antes</h3>

                <pre className="mt-2 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
                  {json(entry.before)}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Depois</h3>

                <pre className="mt-2 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
                  {json(entry.after)}
                </pre>
              </div>

              {entry.metadata ? (
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-semibold">Metadados</h3>

                  <pre className="mt-2 overflow-auto rounded-xl bg-stone-100 p-4 text-xs">
                    {json(entry.metadata)}
                  </pre>
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
