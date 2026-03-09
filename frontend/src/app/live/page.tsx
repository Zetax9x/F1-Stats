"use client";

import { useCallback, useState } from "react";
import {
  getMeetings,
  getOpenF1,
  type Meeting,
  type Session,
  type SessionResult,
} from "@/lib/api";

const YEARS = [2023, 2024, 2025];

export default function WeekendPage() {
  const [year, setYear] = useState<number>(2024);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleYearChange = (y: number) => {
    if (y === year) return;
    setYear(y);
    setError(null);
    setLoading(true);
    setSelectedMeeting(null);
    setSessions([]);
    setSelectedSession(null);
    setResults([]);
    getMeetings(y)
      .then(setMeetings)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  };

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setError(null);
    setLoading(true);
    setSessions([]);
    setSelectedSession(null);
    setResults([]);
    getOpenF1<Session[]>("sessions", { meeting_key: meeting.meeting_key })
      .then((data) => {
        setSessions(data);
        setSelectedSession(null);
        setResults([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  };

  const loadSessionResults = useCallback((session: Session) => {
    setSelectedSession(session);
    setError(null);
    setLoading(true);
    getOpenF1<SessionResult[]>("session_result", { session_key: session.session_key })
      .then(setResults)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Weekend</h1>
      <p className="mt-2 text-zinc-400">
        Scegli un weekend di gara e visualizza le sessioni e i risultati.
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
        <h2 className="text-lg font-semibold">Weekend (Meeting)</h2>
        {loading && !meetings.length && <p className="mt-2 text-zinc-500">Caricamento…</p>}
        {error && <p className="mt-2 text-red-400">{error}</p>}
        {meetings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {meetings.map((m) => (
              <li key={m.meeting_key}>
                <button
                  type="button"
                  onClick={() => handleSelectMeeting(m)}
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
          <h2 className="text-lg font-semibold">Sessioni del weekend</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <button
                key={s.session_key}
                type="button"
                onClick={() => loadSessionResults(s)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedSession?.session_key === s.session_key
                    ? "border-red-600 bg-zinc-800"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">{s.session_name}</div>
                <div className="mt-1 text-sm text-zinc-400">{s.circuit_short_name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {s.date_start ? new Date(s.date_start).toLocaleDateString() : ""}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">
            Risultati — {selectedSession.session_name}
          </h2>
          {loading && <p className="mt-2 text-zinc-500">Caricamento…</p>}
          {error && <p className="mt-2 text-red-400">{error}</p>}
          {results.length > 0 && (
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
        </section>
      )}
    </div>
  );
}
