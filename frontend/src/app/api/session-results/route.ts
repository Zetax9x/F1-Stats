import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  type SessionResultRow = {
    year: number;
    event_round: number;
    session_code: string;
    driver_number: number;
    position: number;
    gap_to_leader: number | null;
    number_of_laps: number;
    driver_name: string;
    driver_abbreviation: string;
    team_name: string;
    team_color: string;
    headshot_url: string;
    classified_position: number;
    grid_position: number;
    status: string;
    points: number;
    dnf: boolean;
    dns: boolean;
    dsq: boolean;
    
  };
  
/** "0 days 00:00:02.974000" → 2.974; "NaT" o vuoto → null */
function parseTimeToSeconds(value: unknown): number | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s || s === "NaT") return null;
  const match = s.match(/0 days (\d+):(\d+):(\d+)\.?(\d*)/);
  if (!match) return null;
  const [, h, m, sec, frac] = match;
  const seconds =
    (Number(h) || 0) * 3600 +
    (Number(m) || 0) * 60 +
    (Number(sec) || 0) +
    (Number((frac ?? "0").padEnd(6, "0").slice(0, 6)) || 0) / 1e6;
  return seconds;
}
  
  function mapRow(
    row: Record<string, unknown>,
    year: number,
    eventRound: number,
    sessionCode: string,
  ): SessionResultRow {
    const status = String(row.Status ?? "").toLowerCase();
    return {
      year,
      event_round: eventRound,
      session_code: sessionCode,
      driver_number: Number(row.DriverNumber) ?? 0,
      position: Number(row.Position) ?? 0,
      gap_to_leader: parseTimeToSeconds(row.Time),
      number_of_laps: Number(row.Laps) ?? 0,
      driver_name: (row.FullName ?? row.BroadcastName ?? "") as string,
      driver_abbreviation: (row.Abbreviation ?? "") as string,
      team_name: (row.TeamName ?? "") as string,
      team_color: (row.TeamColor ?? "") as string,
      headshot_url: (row.HeadshotUrl ?? "") as string,
      classified_position: Number(row.ClassifiedPosition) ?? 0,
      grid_position: Number(row.GridPosition) ?? 0,
      status: (row.Status ?? "") as string,
      points: Number(row.Points) ?? 0,
      dnf: status === "Retired",
      dns: status === "Did Not Start",
      dsq: status === "Disqualified"
    };
  }
  
  
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = searchParams.get("year");
    const round =
      searchParams.get("round_number") ?? searchParams.get("event_round");
    const sessionCode = searchParams.get("session_code");
    const driver = searchParams.get("driver");

    if (!year || !round || !sessionCode) {
      return NextResponse.json(
        {
          error:
            "Missing required query params: year, round_number/event_round, session_code",
        },
        { status: 400 },
      );
    }

    const qs = new URLSearchParams();
    if (driver) {
      qs.set("driver", driver);
    }

    const url = `${BACKEND_URL}/sessions/${encodeURIComponent(
      year,
    )}/${encodeURIComponent(round)}/${encodeURIComponent(
      sessionCode,
    )}/results${qs.toString() ? `?${qs.toString()}` : ""}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch session results" },
        { status: res.status },
      );
    }

    const payload = await res.json() as {
      meta?: { year: number, round_number: number,session_code: string};
      data?: Record<string, unknown>[];
    };

    const rawList = Array.isArray(payload.data) ? payload.data : [];
    const rows = rawList.map((row) => 
      mapRow(
        row,
        payload.meta?.year ?? Number(year),
        payload.meta?.round_number ?? Number(round),
        payload.meta?.session_code ?? sessionCode,    
      )
    );

    
        return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 },
    );
  }
}

