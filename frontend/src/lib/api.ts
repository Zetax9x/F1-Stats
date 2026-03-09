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
