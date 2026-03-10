"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFastf1Seasons,
  getFastf1Events,
  getFastf1Sessions,
  getFastf1SessionSummary,
  getFastf1Laps,
  type Meeting,
  type Session,
  type SessionResult,
  type Lap,
} from "@/lib/api";

function isMeetingDatePastOrToday(dateStart?: string | null): boolean {
  if (!dateStart || typeof dateStart !== "string") return false;
  const today = new Date();
  const dateStr = dateStart.slice(0, 10); // YYYY-MM-DD
  const meetingDate = new Date(dateStr);
  today.setHours(0, 0, 0, 0);
  meetingDate.setHours(0, 0, 0, 0);
  return meetingDate.getTime() <= today.getTime();
}

function formatRaceTimeFromSeconds(totalSeconds?: number | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(Math.floor(seconds)).padStart(2, "0");
  const ms = String(Math.round((seconds % 1) * 1000)).padStart(3, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}.${ms}` : `${mm}:${ss}.${ms}`;
}

export default function StoricoPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "laps">("results");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMeetings = async () => {
      try {
        if (!cancelled) {
          setError(null);
          setLoading(true);
        }

        let targetYear = year;
        try {
          const seasons = await getFastf1Seasons();
          if (cancelled) return;
          const available = seasons.map((s) => s.year).sort((a, b) => b - a);
          setAvailableYears(available);
          if (!available.includes(year) && available.length > 0) {
            targetYear = available[0];
            setYear(targetYear);
          }
        } catch {
          // fallback silenzioso: usiamo semplicemente year
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
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      try {
        if (!cancelled) {
          setError(null);
          setLoading(true);
        }
        const data = await getFastf1Sessions({
          year: selectedMeeting.year,
          event_round: selectedMeeting.event_round,
        });
        if (cancelled) return;
        setSessions(data as Session[]);
        setSelectedSession(null);
        setResults([]);
        setLaps([]);
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

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [selectedMeeting]);

  const handleYearChange = (y: number) => {
    setError(null);
    setLoading(true);
    setYear(y);
    setSelectedMeeting(null);
    setSelectedMeetingIndex(null);
    setSessions([]);
    setSelectedSession(null);
    setResults([]);
    setLaps([]);
  };

  const handleMeetingSelect = (m: Meeting, index: number) => {
    setError(null);
    setLoading(true);
    setSelectedMeeting(m);
    setSelectedMeetingIndex(index);
    setSelectedSession(null);
    setResults([]);
    setLaps([]);
  };

  const loadSessionDetail = useCallback((session: Session) => {
    setSelectedSession(session);
    setError(null);
    setLoading(true);
    Promise.all([
      getFastf1SessionSummary({
        year: session.year,
        event_round: session.event_round,
        session_code: session.session_code,
      }),
      getFastf1Laps({
        year: session.year,
        event_round: session.event_round,
        session_code: session.session_code,
      }),
    ])
      .then(([res, lapsData]) => {
        if (mountedRef.current) {
          setResults(res);
          setLaps(lapsData);
        }
      })
      .catch((e) => {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Errore");
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  }, []);

  const handleSessionSelect = (sessionCode: string) => {
    const session = sessions.find((s) => s.session_code === sessionCode);
    if (session) {
      loadSessionDetail(session);
    }
  };

  const filteredMeetings = meetings.filter(
    (m) =>
      !m.meeting_name?.includes("Pre-Season") &&
      (isMeetingDatePastOrToday(m.date_start) ||
        (selectedMeeting != null &&
          m.meeting_name === selectedMeeting.meeting_name &&
          m.circuit_short_name === selectedMeeting.circuit_short_name))
  );

  const meetingSelectValue =
    selectedMeetingIndex ??
    (selectedMeeting
      ? filteredMeetings.findIndex(
          (m) =>
            m.meeting_name === selectedMeeting.meeting_name &&
            m.circuit_short_name === selectedMeeting.circuit_short_name
        )
      : -1);

  return (
    <div>
      <h1 className="font-formula text-3xl font-bold uppercase tracking-wide">Storico</h1>
      <p className="mt-2 text-zinc-400">
        Sfoglia anni, meeting e sessioni; visualizza risultati e giri.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-sm font-medium text-zinc-400">
            Anno
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {(availableYears.length ? availableYears : [year]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="meeting-select" className="text-sm font-medium text-zinc-400">
            Meeting
          </label>
          <select
            id="meeting-select"
            value={meetingSelectValue >= 0 ? meetingSelectValue : ""}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const m = filteredMeetings[idx];
              if (m != null) handleMeetingSelect(m, idx);
            }}
            disabled={loading && !meetings.length}
            className="min-w-[200px] rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
          >
            <option value="">{loading && !meetings.length ? "Caricamento…" : "Seleziona meeting"}</option>
            {filteredMeetings.map((m, idx) => (
              <option key={`${m.year}-${m.event_round}-${idx}`} value={idx}>
                {m.meeting_name} — {m.circuit_short_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="session-select" className="text-sm font-medium text-zinc-400">
            Sessione
          </label>
          <select
            id="session-select"
            value={selectedSession?.session_code ?? ""}
            onChange={(e) => handleSessionSelect(e.target.value)}
            disabled={!selectedMeeting || sessions.length === 0}
            className="min-w-[140px] rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
          >
            <option value="">
              {!selectedMeeting ? "Seleziona meeting" : sessions.length === 0 ? "Caricamento…" : "Seleziona sessione"}
            </option>
            {sessions.map((s, idx) => (
              <option key={`${s.year}-${s.event_round}-${s.session_code}-${idx}`} value={s.session_code}>
                {s.session_name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {selectedSession && (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-formula text-lg font-semibold uppercase">
            {selectedSession.session_name}
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
            <div className="mt-4 overflow-x-auto rounded-md border border-[#333333] bg-[#1a1a1a] shadow-xl">
              <table className="font-timing min-w-[900px] w-full table-fixed border-collapse text-[11px] leading-[1.35]">
                <thead className="font-timing border-b border-[#333333] bg-[#222222] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bbbbbb]">
                  <tr>
                    <th className="border-r border-[#333333] px-3 py-2 text-left w-24">Position</th>
                    <th className="border-r border-[#333333] px-3 py-2 text-left w-12">Points</th>
                    <th className="border-r border-[#333333] px-3 py-2 text-left w-40">Lap time</th>
                    <th className="border-r border-[#333333] px-3 py-2 text-right w-24">Gap</th>
                    <th className="border-r border-[#333333] px-3 py-2 text-right w-24">Interval</th>
                    <th className="px-3 py-2 text-right w-12">Pit</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const isLeader = r.position === 1;
                    const leaderLaps =
                      results.length > 0 ? results[0]?.number_of_laps ?? null : null;
                    const lapsDiff =
                      leaderLaps != null && r.number_of_laps != null
                        ? leaderLaps - r.number_of_laps
                        : 0;
                    const isLapped = lapsDiff > 0 || r.status === "Lapped";

                    const statusLabel =
                      r.status === "Retired"
                        ? "DNF"
                        : r.status === "Did not start"
                          ? "DNS"
                          : r.status === "Disqualified"
                            ? "DSQ"
                            : "";

                    const gapSeconds =
                      typeof r.gap_to_leader === "number"
                        ? r.gap_to_leader
                        : Number(r.gap_to_leader ?? 0);
                    const prevGap =
                      i === 0
                        ? null
                        : typeof results[i - 1]?.gap_to_leader === "number"
                          ? results[i - 1].gap_to_leader
                          : Number(results[i - 1]?.gap_to_leader ?? 0);
                    const safePrevGap =
                      typeof prevGap === "number" ? prevGap : Number(prevGap ?? 0);
                    const intervalSeconds =
                      !isLeader && safePrevGap && gapSeconds
                        ? gapSeconds - safePrevGap
                        : null;

                    let gapDisplay: string;
                    if (statusLabel) {
                      gapDisplay = statusLabel;
                    } else if (isLeader) {
                      gapDisplay = formatRaceTimeFromSeconds(gapSeconds);
                    } else if (isLapped) {
                      const lapLabel =
                        lapsDiff > 0 ? `${lapsDiff}L` : "Lapped";
                      gapDisplay =
                        gapSeconds && gapSeconds > 0
                          ? `${lapLabel} +${gapSeconds.toFixed(3)}`
                          : lapLabel;
                    } else {
                      gapDisplay =
                        gapSeconds && gapSeconds > 0
                          ? `+${gapSeconds.toFixed(3)}`
                          : "—";
                    }

                    const intervalDisplay =
                      intervalSeconds && intervalSeconds > 0
                        ? `+${intervalSeconds.toFixed(3)}`
                        : "—";

                    const teamColor = (r as { team_color?: string }).team_color;
                    const barColor = teamColor
                      ? `#${teamColor.replace(/^#/, "")}`
                      : "#4a4a4a";

                    return (
                      <tr
                        key={`${r.driver_number}-${i}`}
                        className={`border-t border-[#333333] transition-colors hover:bg-[#2e2e2e] ${
                          isLeader ? "bg-[#252525]" : "bg-[#2c2c2c]"
                        }`}
                        style={
                          isLeader
                            ? { boxShadow: "inset 4px 0 0 0 #5dd4ff" }
                            : undefined
                        }
                      >
                        <td className="border-r border-[#333333] py-1 pl-2 pr-2 text-left text-[#e0e0e0]">
                          <span className="inline-block w-4 text-right mr-2 tabular-nums">
                            {r.position}
                          </span>
                          <span
                            className={`inline-block w-7 text-[10px] tabular-nums ${
                              r.grid_position - r.position > 0
                                ? "text-[#00e600]"
                                : r.grid_position - r.position < 0
                                  ? "text-[#ff3333]"
                                  : "text-[#666666]"
                            }`}
                          >
                            {r.grid_position - r.position > 0
                              ? `↑${r.grid_position - r.position}`
                              : r.grid_position - r.position < 0
                                ? `↓${Math.abs(r.grid_position - r.position)}`
                                : "—"}
                          </span>
                        </td>
                        <td className="border-r border-[#333333] px-3 py-1 text-left tabular-nums">
                          {r.points}
                        </td>
                        <td
                          className="border-r border-[#333333] py-1 pl-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#e0e0e0]"
                          style={{ borderLeft: `4px solid ${barColor}` }}
                        >
                          {r.driver_name}
                        </td>
                        <td className="border-r border-[#333333] px-3 py-1 text-right tabular-nums">
                          <span
                            className={
                              statusLabel
                                ? "text-[#ff8c00]"
                                : isLeader
                                  ? "text-[#999999]"
                                  : isLapped
                                    ? "text-[#ffa500]"
                                    : "text-[#00e600]"
                            }
                          >
                            {gapDisplay}
                          </span>
                        </td>
                        <td
                          className={`border-r border-[#333333] px-3 py-1 text-right tabular-nums ${
                            intervalDisplay !== "—" ? "text-[#00e600]" : "text-[#999999]"
                          }`}
                        >
                          {intervalDisplay}
                        </td>
                        <td className="px-3 py-1 text-right tabular-nums text-[#999999]">
                          —
                        </td>
                      </tr>
                    );
                  })}
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
