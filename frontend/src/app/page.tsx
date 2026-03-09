"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/api";

const dashboardLinks = [
  { href: "/storico", label: "Storico", description: "Anni, meeting, sessioni, risultati e giri" },
  { href: "/weekend", label: "Weekend", description: "Weekend di gara attuale o selezionato" },
  { href: "/telemetrie", label: "Telemetrie", description: "Speed, throttle, brake per sessione e pilota" },
  { href: "/team-radio", label: "Team Radio", description: "Audio pilota–team per sessione" },
];

export default function Home() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="font-sans">
      <h1 className="text-3xl font-bold tracking-tight">F1 <span className="text-red-600">Stats</span></h1>
      <p className="mt-2 text-zinc-400">
        Statistiche, telemetrie, team radio e weekend di gara
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
            Backend not reachable. Check that BACKEND_URL is set on Vercel (or
            that the backend is running locally).
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Sezioni</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {dashboardLinks.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
