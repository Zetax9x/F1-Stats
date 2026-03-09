"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getFastf1Seasons,
  getFastf1Events,
  getFastf1Sessions,
  getFastf1SessionSummary,
  getFastf1Telemetry,
  type Meeting,
  type Session,
  type SessionResult,
  type Fastf1TelemetryPoint,
} from "@/lib/api";

export default function TelemetriePage() {
  const [year, setYear] = useState<number>(2024);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<SessionResult[]>([]);
  const [driver1, setDriver1] = useState<number | null>(null);
  const [driver2, setDriver2] = useState<number | null>(null);
  const [carData1, setCarData1] = useState<Fastf1TelemetryPoint[]>([]);
  const [carData2, setCarData2] = useState<Fastf1TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    setSelectedMeeting(null);
    setSessions([]);
    setSelectedSession(null);
    setDrivers([]);
    setDriver1(null);
    setDriver2(null);
    setCarData1([]);
    setCarData2([]);

    const loadMeetings = async () => {
      try {
        setError(null);
        setLoading(true);

        let targetYear = year;
        try {
          const seasons = await getFastf1Seasons();
          const available = seasons.map((s) => s.year).sort((a, b) => b - a);
          if (!cancelled) {
            setAvailableYears(available);
          }
          if (!available.includes(year) && available.length > 0) {
            targetYear = available[0];
            if (!cancelled) {
              setYear(targetYear);
            }
          }
        } catch {
          // se il backend /seasons fallisce, usiamo semplicemente l'anno corrente
        }

        const events = await getFastf1Events(targetYear);
        if (!cancelled) {
          setMeetings(events as Meeting[]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Errore");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMeetings();

    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    if (!selectedMeeting) {
      setSessions([]);
      setSelectedSession(null);
      return;
    }
    setError(null);
    setLoading(true);
    getFastf1Sessions({ year: selectedMeeting.year, event_round: selectedMeeting.event_round })
      .then((data) => {
        setSessions(data as Session[]);
        setSelectedSession(null);
        setDrivers([]);
        setDriver1(null);
        setDriver2(null);
        setCarData1([]);
        setCarData2([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedMeeting, year]);

  useEffect(() => {
    if (!selectedSession) {
      setDrivers([]);
      setDriver1(null);
      setDriver2(null);
      setCarData1([]);
      setCarData2([]);
      return;
    }
    setError(null);
    setLoading(true);
    getFastf1SessionSummary({
      year: selectedSession.year,
      event_round: selectedSession.event_round,
      session_code: selectedSession.session_code,
    })
      .then((rows) => {
        setDrivers(rows);
        setDriver1(rows[0]?.driver_number ?? null);
        setDriver2(rows[1]?.driver_number ?? null);
        setCarData1([]);
        setCarData2([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedSession]);

  const loadTelemetry = useCallback(() => {
    if (!selectedSession) return;
    setError(null);
    setLoading(true);
    const promises: Promise<Fastf1TelemetryPoint[]>[] = [];
    if (driver1 != null) {
      promises.push(
        getFastf1Telemetry({
          year: selectedSession.year,
          event_round: selectedSession.event_round,
          session_code: selectedSession.session_code,
          driver_number: driver1,
        }),
      );
    } else {
      promises.push(Promise.resolve([]));
    }
    if (driver2 != null) {
      promises.push(
        getFastf1Telemetry({
          year: selectedSession.year,
          event_round: selectedSession.event_round,
          session_code: selectedSession.session_code,
          driver_number: driver2,
        }),
      );
    } else {
      promises.push(Promise.resolve([]));
    }
    Promise.all(promises)
      .then(([d1, d2]) => {
        setCarData1(d1);
        setCarData2(d2);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [selectedSession, driver1, driver2]);

  // Build chart data: merge by date (time), sample if too many points
  type ChartRow = { time: string; speed1?: number; speed2?: number; throttle1?: number; throttle2?: number; brake1?: number; brake2?: number };
  const chartData = (() => {
    const maxPoints = 500;
    const byTime = new Map<string, ChartRow>();
    const add = (arr: Fastf1TelemetryPoint[], suffix: "1" | "2") => {
      const step = Math.max(1, Math.floor(arr.length / maxPoints));
      arr.filter((_, i) => i % step === 0).forEach((d) => {
        const key = d.time_s.toFixed(3);
        const existing: ChartRow = byTime.get(key) ?? { time: key };
        if (suffix === "1") {
          existing.speed1 = d.speed;
          existing.throttle1 = d.throttle;
          existing.brake1 = d.brake;
        } else {
          existing.speed2 = d.speed;
          existing.throttle2 = d.throttle;
          existing.brake2 = d.brake;
        }
        byTime.set(key, existing);
      });
    };
    add(carData1, "1");
    add(carData2, "2");
    return Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
  })();

  const driverName = (n: number) => drivers.find((d) => d.driver_number === n)?.driver_name ?? `#${n}`;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Telemetrie</h1>
      <p className="mt-2 text-zinc-400">
        Confronta speed, throttle e brake per sessione e piloti.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Anno e meeting</h2>
        <div className="mt-2 flex gap-2">
          {(availableYears.length ? availableYears : [year]).map((y) => (
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
            value={
              selectedMeeting
                ? `${selectedMeeting.year}-${selectedMeeting.event_round}`
                : ""
            }
            onChange={(e) =>
              setSelectedMeeting(
                meetings.find(
                  (m) => `${m.year}-${m.event_round}` === e.target.value,
                ) ?? null,
              )
            }
          >
            <option value="">Seleziona meeting</option>
            {meetings.map((m, index) => {
              const value = `${m.year}-${m.event_round}`;
              const key = `${value}-${index}`;
              return (
                <option key={key} value={value}>
                  {m.meeting_name} — {m.circuit_short_name}
                </option>
              );
            })}
          </select>
        )}
      </section>

      {sessions.length > 0 && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Sessione</h2>
          <select
            className="mt-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            value={
              selectedSession
                ? `${selectedSession.year}-${selectedSession.event_round}-${selectedSession.session_code}`
                : ""
            }
            onChange={(e) =>
              setSelectedSession(
                sessions.find(
                  (s) =>
                    `${s.year}-${s.event_round}-${s.session_code}` === e.target.value,
                ) ?? null,
              )
            }
          >
            <option value="">Seleziona sessione</option>
            {sessions.map((s, index) => {
              const key = `${s.year}-${s.event_round}-${s.session_code}-${index}`;
              const value = `${s.year}-${s.event_round}-${s.session_code}`;
              return (
                <option key={key} value={value}>
                  {s.session_name}
                </option>
              );
            })}
          </select>
        </section>
      )}

      {drivers.length > 0 && selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Piloti</h2>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Pilota 1</span>
              <select
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
                value={driver1 ?? ""}
                onChange={(e) => setDriver1(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.driver_name} (#{d.driver_number})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Pilota 2</span>
              <select
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
                value={driver2 ?? ""}
                onChange={(e) => setDriver2(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.driver_name} (#{d.driver_number})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadTelemetry}
              disabled={loading || (driver1 == null && driver2 == null)}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Carica telemetria
            </button>
          </div>
        </section>
      )}

      {loading && <p className="mt-4 text-zinc-500">Caricamento…</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}

      {chartData.length > 0 && (
        <section className="mt-8 space-y-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Grafici</h2>
          <div className="space-y-6">
            <div className="h-64">
              <p className="mb-2 text-sm text-zinc-400">Speed (km/h)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }} />
                  <Legend />
                  {driver1 != null && <Line type="monotone" dataKey="speed1" name={driverName(driver1)} stroke="#ef4444" dot={false} />}
                  {driver2 != null && <Line type="monotone" dataKey="speed2" name={driverName(driver2)} stroke="#22c55e" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <p className="mb-2 text-sm text-zinc-400">Throttle (%)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }} />
                  <Legend />
                  {driver1 != null && <Line type="monotone" dataKey="throttle1" name={driverName(driver1)} stroke="#f97316" dot={false} />}
                  {driver2 != null && <Line type="monotone" dataKey="throttle2" name={driverName(driver2)} stroke="#06b6d4" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <p className="mb-2 text-sm text-zinc-400">Brake (%)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }} />
                  <Legend />
                  {driver1 != null && <Line type="monotone" dataKey="brake1" name={driverName(driver1)} stroke="#eab308" dot={false} />}
                  {driver2 != null && <Line type="monotone" dataKey="brake2" name={driverName(driver2)} stroke="#8b5cf6" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Dati campionati per rendere i grafici leggibili.</p>
        </section>
      )}
    </div>
  );
}
