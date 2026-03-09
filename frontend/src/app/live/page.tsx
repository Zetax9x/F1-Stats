"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFastf1Seasons,
  getFastf1Events,
  getFastf1Sessions,
  getFastf1SessionSummary,
  getFastf1Laps,
  getStartingGridFastf1,
  getStintsFastf1,
  getPitsFastf1,
  type Meeting,
  type Session,
  type SessionResult,
  type Lap,
  type Fastf1StartingGrid,
  type Fastf1Stint,
  type Fastf1PitSummary,
} from "@/lib/api";

export default function LivePage() {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingGrid, setStartingGrid] = useState<Fastf1StartingGrid[]>([]);
  const [stints, setStints] = useState<Fastf1Stint[]>([]);
  const [pits, setPits] = useState<Fastf1PitSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentWeekend = async () => {
      try {
        setError(null);
        setLoading(true);

        // Prendiamo la stagione più recente esposta dal backend FastF1.
        const seasons = await getFastf1Seasons();
        const latestSeason = seasons[0];
        if (!latestSeason) {
          if (!cancelled) setError("Nessuna stagione FastF1 disponibile.");
          return;
        }

        const events = await getFastf1Events(latestSeason.year);
        const latestEvent = events[0];
        if (!latestEvent) {
          if (!cancelled) setError("Nessun evento disponibile per la stagione corrente.");
          return;
        }

        const sessionsForEvent = await getFastf1Sessions({
          year: latestEvent.year,
          event_round: latestEvent.event_round,
        });

        if (cancelled) return;

        // Filtra solo le sessioni di oggi e in un range orario ragionevole
        // (un po' prima e un po' dopo l'inizio sessione) per evitare polling
        // quando non c'è nulla in corso.
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000; // 2h prima
        const WINDOW_AFTER_MS = 4 * 60 * 60 * 1000; // 4h dopo

        const todaysSessions = sessionsForEvent.filter((s) => {
          if (!s.date_start) return false;
          const start = new Date(s.date_start);
          if (start.toISOString().slice(0, 10) !== todayStr) return false;
          const diff = now.getTime() - start.getTime();
          return diff >= -WINDOW_BEFORE_MS && diff <= WINDOW_AFTER_MS;
        });

        setSelectedMeeting(latestEvent as Meeting);
        setSessions(sessionsForEvent as Session[]);

        if (todaysSessions.length === 0) {
          // Non è un giorno/orario con sessioni in corso: niente chiamate live.
          setSelectedSession(null);
          setResults([]);
          setLaps([]);
          setStartingGrid([]);
          setStints([]);
          setPits([]);
          setError("In questo momento non c'è nessuna sessione live (prove libere, qualifica o gara).");
          return;
        }

        const latestSession = todaysSessions[todaysSessions.length - 1];
        setSelectedSession(latestSession as Session);

        const [initialResults, initialLaps, gridData, stintData, pitData] = await Promise.all([
          getFastf1SessionSummary({
            year: latestSession.year,
            event_round: latestSession.event_round,
            session_code: latestSession.session_code,
          }),
          getFastf1Laps({
            year: latestSession.year,
            event_round: latestSession.event_round,
            session_code: latestSession.session_code,
          }),
          getStartingGridFastf1({
            year: latestSession.year,
            event_round: latestSession.event_round,
            session_code: latestSession.session_code,
          }),
          getStintsFastf1({
            year: latestSession.year,
            event_round: latestSession.event_round,
            session_code: latestSession.session_code,
          }),
          getPitsFastf1({
            year: latestSession.year,
            event_round: latestSession.event_round,
            session_code: latestSession.session_code,
          }),
        ]);

        if (cancelled) return;

        setResults(initialResults);
        setLaps(initialLaps);
        setStartingGrid(gridData);
        setStints(stintData);
        setPits(pitData);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Errore nel caricamento del live.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCurrentWeekend();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;

    let cancelled = false;

    const fetchLatestResults = async () => {
      try {
        const [resultData, lapData, gridData, stintData, pitData] = await Promise.all([
          getFastf1SessionSummary({
            year: selectedSession.year,
            event_round: selectedSession.event_round,
            session_code: selectedSession.session_code,
          }),
          getFastf1Laps({
            year: selectedSession.year,
            event_round: selectedSession.event_round,
            session_code: selectedSession.session_code,
          }),
          getStartingGridFastf1({
            year: selectedSession.year,
            event_round: selectedSession.event_round,
            session_code: selectedSession.session_code,
          }),
          getStintsFastf1({
            year: selectedSession.year,
            event_round: selectedSession.event_round,
            session_code: selectedSession.session_code,
          }),
          getPitsFastf1({
            year: selectedSession.year,
            event_round: selectedSession.event_round,
            session_code: selectedSession.session_code,
          }),
        ]);
        if (!cancelled) {
          setResults(resultData);
          setLaps(lapData);
          setStartingGrid(gridData);
          setStints(stintData);
          setPits(pitData);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Errore nell'aggiornamento del live.");
        }
      }
    };

    fetchLatestResults();
    const id = setInterval(fetchLatestResults, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedSession]);
  const loadSessionResults = useCallback((session: Session) => {
    setSelectedSession(session);
  }, []);

  const gridByDriver = new Map<number, Fastf1StartingGrid>();
  for (const grid of startingGrid) {
    gridByDriver.set(grid.driver_number, grid);
  }

  const stintsByDriver = new Map<number, Fastf1Stint[]>();
  for (const stint of stints) {
    const list = stintsByDriver.get(stint.driver_number) ?? [];
    list.push(stint);
    stintsByDriver.set(stint.driver_number, list);
  }
  // sort stints per driver by lap_start
  for (const [, list] of stintsByDriver) {
    list.sort((a, b) => a.lap_start - b.lap_start);
  }

  const pitsByDriver = new Map<number, number>();
  for (const p of pits) {
    pitsByDriver.set(p.driver_number, p.pit_count);
  }

  const latestLapByDriver = new Map<number, Lap>();
  for (const lap of laps) {
    const hasAnySector =
      lap.duration_sector_1 != null || lap.duration_sector_2 != null || lap.duration_sector_3 != null;
    if (!hasAnySector) continue;

    const existing = latestLapByDriver.get(lap.driver_number);
    if (!existing || (lap.lap_number ?? 0) > (existing.lap_number ?? 0)) {
      latestLapByDriver.set(lap.driver_number, lap);
    }
  }

  const bestSector1 = Math.min(
    ...Array.from(latestLapByDriver.values())
      .map((l) => l.duration_sector_1)
      .filter((v): v is number => v != null),
  );
  const bestSector2 = Math.min(
    ...Array.from(latestLapByDriver.values())
      .map((l) => l.duration_sector_2)
      .filter((v): v is number => v != null),
  );
  const bestSector3 = Math.min(
    ...Array.from(latestLapByDriver.values())
      .map((l) => l.duration_sector_3)
      .filter((v): v is number => v != null),
  );

  const formatSeconds = (value?: number) => {
    if (value == null) return "—";
    const totalMs = Math.round(value * 1000);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
  };

  const sectorClass = (value?: number, best?: number) => {
    if (value == null || best == null || !Number.isFinite(best)) return "";
    if (value === best) return "text-purple-400 font-semibold"; // best overall
    if (value <= best * 1.01) return "text-green-400"; // good sector
    return "text-zinc-200";
  };

  const sessionStatus = (r: SessionResult): { label: string; className: string } | null => {
    if (r.dsq) return { label: "DSQ", className: "text-black-400 font-semibold" };
    if (r.dnf) return { label: "DNF", className: "text-red-400 font-semibold" };
    if (r.dns) return { label: "DNS", className: "text-orange-400" };
    return null;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Live Timing</h1>
      <p className="mt-2 text-zinc-400">
        Weekend attuale, classifica in tempo quasi reale con ultimi giri e settori.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Weekend attuale</h2>
        {loading && !selectedMeeting && <p className="mt-2 text-zinc-500">Caricamento…</p>}
        {error && <p className="mt-2 text-red-400">{error}</p>}
        {selectedMeeting && (
          <p className="mt-2 text-sm text-zinc-300">
            {selectedMeeting.meeting_name} — {selectedMeeting.circuit_short_name} ({selectedMeeting.year})
          </p>
        )}
      </section>

      {sessions.length > 0 && selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Sessioni del weekend</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s, index) => (
              <button
                key={`${s.year}-${s.event_round}-${s.session_code}-${index}`}
                type="button"
                onClick={() => loadSessionResults(s)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedSession &&
                  selectedSession.year === s.year &&
                  selectedSession.event_round === s.event_round &&
                  selectedSession.session_code === s.session_code
                    ? "border-red-600 bg-zinc-800"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">{s.session_name}</div>
                <div className="mt-1 text-sm text-zinc-400">{selectedMeeting?.circuit_short_name ?? ""}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {s.date_start ? new Date(s.date_start).toLocaleString() : ""}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold flex items-center justify-between">
            <span>Live — {selectedSession.session_name}</span>
            <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-400">
              Aggiornamento ogni 5s
            </span>
          </h2>
          {error && <p className="mt-2 text-red-400">{error}</p>}
          {results.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="py-2 px-3 text-center w-12">Posizione</th>
                    <th className="py-2 pr-4 text-left">Pilota #</th>
                    <th className="py-2 pr-4 text-left">Giro</th>
                    <th className="py-2 pr-4 text-left">Ultimo giro</th>
                    <th className="py-2 pr-4 text-left">Gap</th>
                    <th className="py-2 pr-2 text-left">S1</th>
                    <th className="py-2 pr-2 text-left">S2</th>
                    <th className="py-2 pr-2 text-left">S3</th>
                    <th className="py-2 pr-2 text-left">POS</th>
                    <th className="py-2 pr-2 text-left">Tyre</th>
                    <th className="py-2 pr-2 text-left">Pits</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={`${r.driver_number}-${i}`}
                      className={`border-b border-zinc-900 ${
                        r.position === 1 ? "bg-zinc-900/80" : i % 2 === 0 ? "bg-zinc-950/40" : "bg-zinc-950/10"
                      }`}
                    >
                      {(() => {
                        const startPos = gridByDriver.get(r.driver_number);
                        const delta = startPos ? startPos.grid_position - r.position : null;
                        const lap = latestLapByDriver.get(r.driver_number);
                        const driverStints = stintsByDriver.get(r.driver_number) ?? [];
                        let currentStint: Fastf1Stint | undefined;
                        if (lap && driverStints.length) {
                          currentStint =
                            driverStints.find(
                              (s) =>
                                s.lap_start <= lap.lap_number &&
                                (s.lap_end == null || s.lap_end >= lap.lap_number),
                            ) ?? driverStints[driverStints.length - 1];
                        }
                        const lapsOnTyre =
                          lap && currentStint ? lap.lap_number - currentStint.lap_start + 1 : null;
                        const pitCount = pitsByDriver.get(r.driver_number) ?? 0;
                        const teamColor = "#e5e7eb";
                        return (
                          <>
                            <td className="py-2 px-3 text-center font-semibold">
                              {(() => {
                                const st = sessionStatus(r);
                                return st ? <span className={st.className}>{st.label}</span> : r.position;
                              })()}
                            </td>
                            <td className="py-2 pr-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: teamColor ?? "#e5e7eb" }}
                                />
                                  <span>{r.driver_abbreviation.toUpperCase()}</span>
                              </span>
                            </td>
                            <td className="py-2 pr-4">{lap?.lap_number ?? "—"}</td>
                            <td className="py-2 pr-4">{formatSeconds(lap?.lap_duration ?? undefined)}</td>
                            <td className="py-2 pr-4">
                              {r.gap_to_leader == null
                                ? "—"
                                : typeof r.gap_to_leader === "number"
                                  ? r.gap_to_leader === 0
                                    ? "—"
                                    : `+${r.gap_to_leader}`
                                  : String(r.gap_to_leader)}
                            </td>
                            <td className={`py-2 pr-2 ${sectorClass(lap?.duration_sector_1 ?? undefined, bestSector1)}`}>
                              {formatSeconds(lap?.duration_sector_1 ?? undefined)}
                            </td>
                            <td className={`py-2 pr-2 ${sectorClass(lap?.duration_sector_2 ?? undefined, bestSector2)}`}>
                              {formatSeconds(lap?.duration_sector_2 ?? undefined)}
                            </td>
                            <td className={`py-2 pr-2 ${sectorClass(lap?.duration_sector_3 ?? undefined, bestSector3)}`}>
                              {formatSeconds(lap?.duration_sector_3 ?? undefined)}
                            </td>
                            <td className="py-2 pr-2">
                              {delta == null ? "—" : delta === 0 ? "—" : delta > 0 ? `+${delta}` : delta}
                            </td>
                            <td className="py-2 pr-2">
                              {currentStint
                                ? `${currentStint.compound}${lapsOnTyre != null ? ` (${lapsOnTyre})` : ""}`
                                : "—"}
                            </td>
                            <td className="py-2 pr-2">{pitCount || "—"}</td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="mt-2 text-zinc-500">Nessun dato live disponibile al momento.</p>
          )}
        </section>
      )}
    </div>
  );
}
