"use client";

import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/api";

export function FooterStatus() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          backendOk === null
            ? "bg-zinc-500"
            : backendOk
            ? "bg-emerald-500"
            : "bg-red-500"
        }`}
      />
      <span>
        {backendOk === null
          ? "Verifica connessione backend…"
          : backendOk
          ? "Online"
          : "Offline"}
      </span>
    </div>
  );
}

