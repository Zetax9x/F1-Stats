import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/seasons`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch seasons" },
        { status: res.status },
      );
    }

    const payload = await res.json();

    const seasonsRaw =
      Array.isArray(payload) || payload == null
        ? payload ?? []
        : "data" in payload && Array.isArray((payload as { data: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : [];

    const seasons = (seasonsRaw as Array<number | { year: number }>).map((s) =>
      typeof s === "number" ? { year: s } : { year: s.year },
    );

    return NextResponse.json(seasons);
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 },
    );
  }
}

