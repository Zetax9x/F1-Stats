"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMeetings,
  getOpenF1,
  type Meeting,
  type Session,
  type SessionResult,
  type Lap,
} from "@/lib/api";

const YEARS = [2023, 2024, 2025];

export default function StoricoPage() {
  const [year, setYear] = useState<number>(2024);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "laps">("results");

  useEffect(() => {
    let cancelled = false;

    getMeetings(year)
      .then((data) => {
        if (cancelled) return;
        setMeetings(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Errore");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    if (!selectedMeeting) {
      return;
    }

    let cancelled = false;

    getOpenF1<Session[]>("sessions", { meeting_key: selectedMeeting.meeting_key })
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        setSelectedSession(null);
        setResults([]);
        setLaps([]);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Errore");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMeeting]);

  const handleYearChange = (y: number) => {
    setError(null);
    setLoading(true);
    setYear(y);
    setSelectedMeeting(null);
    setSessions([]);
    setSelectedSession(null);
    setResults([]);
    setLaps([]);
  };

  const handleMeetingSelect = (m: Meeting) => {
    setError(null);
    setLoading(true);
    setSelectedMeeting(m);
    setSelectedSession(null);
    setResults([]);
    setLaps([]);
  };

  const loadSessionDetail = useCallback((session: Session) => {
    setSelectedSession(session);
    setError(null);
    setLoading(true);
    Promise.all([
      getOpenF1<SessionResult[]>("session_result", { session_key: session.session_key }),
      getOpenF1<Lap[]>("laps", { session_key: session.session_key }),
    ])
      .then(([res, lapsData]) => {
        setResults(res);
        setLaps(lapsData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Storico</h1>
      <p className="mt-2 text-zinc-400">
        Sfoglia anni, meeting e sessioni; visualizza risultati e giri.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Anno</h2>
        <div className="mt-2 flex gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                year === y
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Meeting</h2>
        {loading && !meetings.length && <p className="mt-2 text-zinc-500">Caricamento…</p>}
        {error && <p className="mt-2 text-red-400">{error}</p>}
        {meetings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {meetings.map((m) => (
              <li key={m.meeting_key}>
                <button
                  type="button"
                  onClick={() => handleMeetingSelect(m)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    selectedMeeting?.meeting_key === m.meeting_key
                      ? "bg-zinc-700"
                      : "hover:bg-zinc-800"
                  }`}
                >
                  {m.meeting_name} — {m.circuit_short_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sessions.length > 0 && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Sessioni</h2>
          <ul className="mt-2 space-y-1">
            {sessions.map((s) => (
              <li key={s.session_key}>
                <button
                  type="button"
                  onClick={() => loadSessionDetail(s)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    selectedSession?.session_key === s.session_key
                      ? "bg-zinc-700"
                      : "hover:bg-zinc-800"
                  }`}
                >
                  {s.session_name} — {s.circuit_short_name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">
            {selectedSession.session_name} — Dettaglio
          </h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("results")}
              className={`rounded px-3 py-1 text-sm ${
                activeTab === "results" ? "bg-zinc-700" : "bg-zinc-800"
              }`}
            >
              Risultati
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("laps")}
              className={`rounded px-3 py-1 text-sm ${
                activeTab === "laps" ? "bg-zinc-700" : "bg-zinc-800"
              }`}
            >
              Giri
            </button>
          </div>
          {loading && <p className="mt-2 text-zinc-500">Caricamento…</p>}
          {error && <p className="mt-2 text-red-400">{error}</p>}
          {activeTab === "results" && results.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="py-2 pr-4">Pos</th>
                    <th className="py-2 pr-4">Driver #</th>
                    <th className="py-2 pr-4">Gap</th>
                    <th className="py-2">Giri</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={`${r.driver_number}-${i}`} className="border-b border-zinc-800">
                      <td className="py-2 pr-4">{r.position}</td>
                      <td className="py-2 pr-4">{r.driver_number}</td>
                      <td className="py-2 pr-4">{String(r.gap_to_leader)}</td>
                      <td className="py-2">{r.number_of_laps ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "laps" && laps.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="py-2 pr-4">Driver #</th>
                    <th className="py-2 pr-4">Giro</th>
                    <th className="py-2 pr-4">Durata</th>
                    <th className="py-2">Pit out</th>
                  </tr>
                </thead>
                <tbody>
                  {laps.slice(0, 50).map((lap, i) => (
                    <tr key={`${lap.driver_number}-${lap.lap_number}-${i}`} className="border-b border-zinc-800">
                      <td className="py-2 pr-4">{lap.driver_number}</td>
                      <td className="py-2 pr-4">{lap.lap_number}</td>
                      <td className="py-2 pr-4">{lap.lap_duration != null ? lap.lap_duration.toFixed(3) : "—"}</td>
                      <td className="py-2">{lap.is_pit_out_lap ? "Sì" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {laps.length > 50 && (
                <p className="mt-2 text-zinc-500">Mostrati i primi 50 giri.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
