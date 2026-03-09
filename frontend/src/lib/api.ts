/**
 * API client for F1 Stats.
 * Uses Next.js API routes (/api/*) as proxy so that HTTPS (Vercel) can call
 * the HTTP backend on Oracle Cloud without mixed-content blocking.
 */

const API_BASE =
  typeof window !== "undefined"
    ? "" // In browser: call same origin (/api/*), Next.js server proxies to backend
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function healthCheck(): Promise<{ status: string }> {
  const url = API_BASE ? `${API_BASE}/health` : "/api/health";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

// --- Types (OpenF1) ---

export type Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
};

export type Meeting = {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
};

export type SessionResult = {
  session_key: number;
  driver_number: number;
  position: number;
  gap_to_leader: number | string;
  duration?: number;
  number_of_laps?: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
};

export type Lap = {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration?: number;
  duration_sector_1?: number;
  duration_sector_2?: number;
  duration_sector_3?: number;
  is_pit_out_lap?: boolean;
};

export type CarData = {
  session_key: number;
  driver_number: number;
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  rpm?: number;
  n_gear?: number;
  drs?: number;
};

export type TeamRadio = {
  session_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
};

export type Driver = {
  session_key: number;
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  broadcast_name: string;
  headshot_url: string;
  team_colour: string;
  last_name: string;
};

export type StartingGrid = {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;      // posizione in griglia
  lap_duration?: number; // giro di qualifica
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

// --- Sessions ---

export async function getSessions(params?: {
  year?: number;
  country_name?: string;
  session_name?: string;
}): Promise<Session[]> {
  const searchParams = new URLSearchParams();
  if (params?.year != null) searchParams.set("year", String(params.year));
  if (params?.country_name) searchParams.set("country_name", params.country_name);
  if (params?.session_name) searchParams.set("session_name", params.session_name);
  const qs = searchParams.toString();
  const url = API_BASE
    ? `${API_BASE}/api/sessions${qs ? `?${qs}` : ""}`
    : `/api/sessions${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

// --- Helpers (OpenF1 proxy) ---

export async function getMeetings(year: number): Promise<Meeting[]> {
  return getOpenF1<Meeting[]>("meetings", { year });
}

export async function getTeamRadio(
  session_key: number,
  driver_number?: number
): Promise<TeamRadio[]> {
  const params: Record<string, number> = { session_key };
  if (driver_number != null) params.driver_number = driver_number;
  return getOpenF1<TeamRadio[]>("team_radio", params);
}

export async function getStartingGrid(session_key: number): Promise<StartingGrid[]> {
  return getOpenF1<StartingGrid[]>("starting_grid", { session_key });
}

export async function getStartingGridFastf1(session_key: number): Promise<Fastf1StartingGrid[]> {
  const searchParams = new URLSearchParams({ session_key: String(session_key) });
  const base = API_BASE ?? "";
  const url = base ? `${base}/api/starting-grid-fastf1?${searchParams.toString()}` : `/api/starting-grid-fastf1?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch FastF1 starting grid");
  return res.json();
}

export async function getStintsFastf1(session_key: number): Promise<Fastf1Stint[]> {
  const searchParams = new URLSearchParams({ session_key: String(session_key) });
  const base = API_BASE ?? "";
  const url = base ? `${base}/api/stints-fastf1?${searchParams.toString()}` : `/api/stints-fastf1?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch FastF1 stints");
  return res.json();
}

export async function getPitsFastf1(session_key: number): Promise<Fastf1PitSummary[]> {
  const searchParams = new URLSearchParams({ session_key: String(session_key) });
  const base = API_BASE ?? "";
  const url = base ? `${base}/api/pits-fastf1?${searchParams.toString()}` : `/api/pits-fastf1?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch FastF1 pit summary");
  return res.json();
}

export async function getCarData(
  session_key: number,
  driver_number: number
): Promise<CarData[]> {
  return getOpenF1<CarData[]>("car_data", { session_key, driver_number });
}

export async function getDrivers(session_key: number): Promise<Driver[]> {
  return getOpenF1<Driver[]>("drivers", { session_key });
}

/**
 * Generic OpenF1 proxy: e.g. getOpenF1("laps", { session_key: 9161, driver_number: 44 })
 */
export async function getOpenF1<T>(
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      searchParams.set(k, String(v));
    }
  }
  const qs = searchParams.toString();
  const url = API_BASE
    ? `${API_BASE}/api/openf1/${path}${qs ? `?${qs}` : ""}`
    : `/api/openf1/${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenF1 proxy failed: ${path}`);
  return res.json();
}
