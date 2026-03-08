/**
 * API client for F1 Stats backend (Oracle Cloud).
 * Base URL is set via NEXT_PUBLIC_API_URL (e.g. https://your-app.online.oraclecloud.com).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

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
  const url = `${API_BASE}/api/sessions${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
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
  const url = `${API_BASE}/api/openf1/${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenF1 proxy failed: ${path}`);
  return res.json();
}
