export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

// --- Types (FastF1) ---

export type Fastf1Season = {
  year: number;
};

export type Fastf1Event = {
  year: number;
  event_round: number;
  meeting_name: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
};

type RawFastf1Event = {
  event_round?: number;
  round_number?: number;
  RoundNumber?: number;
  round?: number;
  year?: number;
  season?: number;
  meeting_name?: string;
  EventName?: string;
  event_name?: string;
  OfficialEventName?: string;
  Name?: string;
  name?: string;
  country_name?: string;
  Country?: string;
  country?: string;
  Location?: string;
  location?: string;
  circuit_short_name?: string;
  CircuitShortName?: string;
  date_start?: string;
  EventDate?: string;
  event_date?: string;
  Session1Date?: string;
  session1_date?: string;
  date?: string;
};

export type Fastf1Session = {
  year: number;
  event_round: number;
  session_code: string; // "R", "Q", "FP1", ...
  session_name: string;
  date_start: string;
};

export type Fastf1SessionResultRow = {
  year: number;
  event_round: number;
  session_code: string;
  driver_number: number;
  position: number;
  gap_to_leader: string;
  number_of_laps: number;
  driver_name: string;
  driver_abbreviation: string;
  classified_position: number;
  grid_position: number;
  team_name: string;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  status?: string;
};

export type Fastf1Lap = {
  year: number;
  event_round: number;
  session_code: string;
  driver_number: number;
  lap_number: number;
  lap_duration?: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  is_pit_out_lap?: boolean;
};

export type Fastf1TelemetryPoint = {
  time_s: number;
  speed: number;
  throttle: number;
  brake: number;
};

export type Fastf1StartingGrid = {
  driver_number: number;
  grid_position: number;
  finish_position: number;
};

export type Fastf1Stint = {
  driver_number: number;
  stint_number: number;
  compound: string;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start?: number | null;
};

export type Fastf1PitSummary = {
  driver_number: number;
  pit_count: number;
};

// Small aliases so we can reuse old names in pages with minimal churn.
export type Session = Fastf1Session;
export type Meeting = Fastf1Event;
export type SessionResult = Fastf1SessionResultRow;
export type Lap = Fastf1Lap;

// --- Helpers for building URLs ---

function apiUrl(path: string, searchParams?: URLSearchParams) {
  const qs = searchParams?.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

// --- Seasons / Events / Sessions ---

export async function getFastf1Seasons(): Promise<Fastf1Season[]> {
  const res = await fetch(apiUrl("/api/seasons"));
  if (!res.ok) throw new Error("Failed to fetch FastF1 seasons");
  return res.json();
}

export async function getFastf1Events(year: number): Promise<Fastf1Event[]> {
  const searchParams = new URLSearchParams({ year: String(year) });
  const res = await fetch(apiUrl("/api/events", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 events");
  const payload = await res.json();
  const rows: RawFastf1Event[] = Array.isArray(payload)
    ? (payload as RawFastf1Event[])
    : payload &&
        typeof payload === "object" &&
        "data" in payload &&
        Array.isArray((payload as { data: unknown }).data)
      ? ((payload as { data: RawFastf1Event[] }).data)
      : [];

  return rows.map((row, index) => {
    let round: number | undefined =
      row.event_round ??
      row.round_number ??
      row.RoundNumber ??
      row.round;

    // Evita round 0 o valori non numerici: fallback all'indice (1-based)
    if (typeof round !== "number" || !Number.isFinite(round) || round < 1) {
      round = index + 1;
    }

    const meeting: Fastf1Event = {
      year:
        typeof row.year === "number"
          ? row.year
          : typeof row.season === "number"
          ? row.season
          : year,
      event_round: round,
      meeting_name:
        row.meeting_name ??
        row.EventName ??
        row.event_name ??
        row.OfficialEventName ??
        row.Name ??
        row.name ??
        `Round ${round}`,
      country_name:
        row.country_name ??
        row.Country ??
        row.country ??
        row.Location ??
        row.location ??
        "",
      circuit_short_name:
        row.circuit_short_name ??
        row.CircuitShortName ??
        row.Location ??
        row.location ??
        "",
      date_start:
        row.date_start ??
        row.EventDate ??
        row.event_date ??
        row.Session1Date ??
        row.session1_date ??
        row.date ??
        "",
    };

    return meeting;
  });
}

export async function getFastf1Sessions(params: {
  year: number;
  event_round: number;
}): Promise<Fastf1Session[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    round_number: String(params.event_round),
  });
  const res = await fetch(apiUrl("/api/sessions", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 sessions");
  return res.json();
}

// --- Session summary / laps / telemetry ---

export async function getFastf1SessionSummary(params: {
  year: number;
  event_round: number;
  session_code: string;
}): Promise<Fastf1SessionResultRow[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    round_number: String(params.event_round),
    session_code: params.session_code,
  });
  const res = await fetch(apiUrl("/api/session-results", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 session summary");
  return res.json();
}

export async function getFastf1Laps(params: {
  year: number;
  event_round: number;
  session_code: string;
}): Promise<Fastf1Lap[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    round_number: String(params.event_round),
    session_code: params.session_code,
  });
  const res = await fetch(apiUrl("/api/session-laps", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 laps");
  return res.json();
}

export async function getFastf1Telemetry(params: {
  year: number;
  event_round: number;
  session_code: string;
  driver_number: number;
}): Promise<Fastf1TelemetryPoint[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    round_number: String(params.event_round),
    session_code: params.session_code,
    driver: String(params.driver_number),
    fastest: "true",
  });
  const res = await fetch(apiUrl("/api/session-telemetry", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 telemetry");
  return res.json();
}

// --- Grid / stints / pits ---

export async function getStartingGridFastf1(params: {
  year: number;
  event_round: number;
  session_code: string;
}): Promise<Fastf1StartingGrid[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    event_round: String(params.event_round),
    session_code: params.session_code,
  });
  const res = await fetch(apiUrl("/api/starting-grid-fastf1", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 starting grid");
  return res.json();
}

export async function getStintsFastf1(params: {
  year: number;
  event_round: number;
  session_code: string;
}): Promise<Fastf1Stint[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    event_round: String(params.event_round),
    session_code: params.session_code,
  });
  const res = await fetch(apiUrl("/api/stints-fastf1", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 stints");
  return res.json();
}

export async function getPitsFastf1(params: {
  year: number;
  event_round: number;
  session_code: string;
}): Promise<Fastf1PitSummary[]> {
  const searchParams = new URLSearchParams({
    year: String(params.year),
    event_round: String(params.event_round),
    session_code: params.session_code,
  });
  const res = await fetch(apiUrl("/api/pits-fastf1", searchParams));
  if (!res.ok) throw new Error("Failed to fetch FastF1 pit summary");
  return res.json();
}
