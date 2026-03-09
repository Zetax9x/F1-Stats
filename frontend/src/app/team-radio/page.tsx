"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMeetings,
  getOpenF1,
  getTeamRadio,
  getDrivers,
  type Meeting,
  type Session,
  type Driver,
  type TeamRadio as TeamRadioType,
} from "@/lib/api";

const YEARS = [2023, 2024, 2025];

export default function TeamRadioPage() {
  const [year, setYear] = useState<number>(2024);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filterDriver, setFilterDriver] = useState<number | null>(null);
  const [radios, setRadios] = useState<TeamRadioType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    getMeetings(year)
      .then(setMeetings)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
    setSelectedMeeting(null);
    setSessions([]);
    setSelectedSession(null);
    setRadios([]);
  }, [year]);

  useEffect(() => {
    if (!selectedMeeting) {
      setSessions([]);
      setSelectedSession(null);
      setRadios([]);
      return;
    }
    setError(null);
    setLoading(true);
    getOpenF1<Session[]>("sessions", { meeting_key: selectedMeeting.meeting_key })
      .then((data) => {
        setSessions(data);
        setSelectedSession(null);
        setRadios([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedMeeting, year]);

  useEffect(() => {
    if (!selectedSession) {
      setDrivers([]);
      setFilterDriver(null);
      setRadios([]);
      return;
    }
    setError(null);
    setLoading(true);
    getDrivers(selectedSession.session_key)
      .then((data) => {
        setDrivers(data);
        setFilterDriver(null);
        setRadios([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedSession]);

  const loadRadios = useCallback(() => {
    if (!selectedSession) return;
    setError(null);
    setLoading(true);
    getTeamRadio(selectedSession.session_key, filterDriver ?? undefined)
      .then(setRadios)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedSession, filterDriver]);

  const driverName = (n: number) => drivers.find((d) => d.driver_number === n)?.full_name ?? `#${n}`;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Team Radio</h1>
      <p className="mt-2 text-zinc-400">
        Ascolta le comunicazioni pilota–team per sessione.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Anno e meeting</h2>
        <div className="mt-2 flex gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                year === y ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        {meetings.length > 0 && (
          <select
            className="mt-3 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            value={selectedMeeting?.meeting_key ?? ""}
            onChange={(e) =>
              setSelectedMeeting(meetings.find((m) => m.meeting_key === Number(e.target.value)) ?? null)
            }
          >
            <option value="">Seleziona meeting</option>
            {meetings.map((m) => (
              <option key={m.meeting_key} value={m.meeting_key}>
                {m.meeting_name} — {m.circuit_short_name}
              </option>
            ))}
          </select>
        )}
      </section>

      {sessions.length > 0 && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Sessione</h2>
          <select
            className="mt-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            value={selectedSession?.session_key ?? ""}
            onChange={(e) =>
              setSelectedSession(sessions.find((s) => s.session_key === Number(e.target.value)) ?? null)
            }
          >
            <option value="">Seleziona sessione</option>
            {sessions.map((s) => (
              <option key={s.session_key} value={s.session_key}>
                {s.session_name}
              </option>
            ))}
          </select>
        </section>
      )}

      {drivers.length > 0 && selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Filtra per pilota (opzionale)</h2>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <select
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              value={filterDriver ?? ""}
              onChange={(e) => setFilterDriver(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Tutti i piloti</option>
              {drivers.map((d) => (
                <option key={d.driver_number} value={d.driver_number}>
                  {d.full_name} (#{d.driver_number})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadRadios}
              disabled={loading}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Carica team radio
            </button>
          </div>
        </section>
      )}

      {loading && <p className="mt-4 text-zinc-500">Caricamento…</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}

      {radios.length > 0 && (
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Registrazioni</h2>
          <ul className="mt-4 space-y-4">
            {radios.map((r, i) => (
              <li
                key={`${r.driver_number}-${r.date}-${i}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{driverName(r.driver_number)}</span>
                  <span className="text-zinc-500">
                    {new Date(r.date).toLocaleString()}
                  </span>
                </div>
                <audio
                  controls
                  src={r.recording_url}
                  className="mt-2 w-full max-w-md"
                  preload="none"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
