"use client";

import { useEffect, useState } from "react";
import { getSessions, healthCheck, type Session } from "@/lib/api";

export default function Home() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  useEffect(() => {
    if (!backendOk) return;
    getSessions({ year: 2024 })
      .then((data) => setSessions(data.slice(0, 5)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [backendOk]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">F1 Stats</h1>
        <p className="mt-2 text-zinc-400">
          Frontend (Vercel) + Backend (Oracle Cloud)
        </p>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Backend connection</h2>
          {backendOk === null && (
            <p className="mt-2 text-zinc-500">Checking backend…</p>
          )}
          {backendOk === true && (
            <p className="mt-2 text-emerald-400">Backend is reachable.</p>
          )}
          {backendOk === false && (
            <p className="mt-2 text-amber-400">
              Backend not reachable. Is it running on{" "}
              <code className="rounded bg-zinc-800 px-1">
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
              </code>
              ?
            </p>
          )}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Sessions (2024) via backend</h2>
          {error && <p className="mt-2 text-red-400">{error}</p>}
          {sessions.length > 0 && (
            <ul className="mt-4 space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.session_key}
                  className="rounded bg-zinc-800/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{s.session_name}</span>
                  <span className="text-zinc-500"> — {s.circuit_short_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
