"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 15_000;

export function OperationAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [router]);

  return <span className="text-xs text-zinc-500">Atualiza automaticamente a cada 15 segundos</span>;
}
