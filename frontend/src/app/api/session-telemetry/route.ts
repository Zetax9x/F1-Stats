import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = searchParams.get("year");
    const round =
      searchParams.get("round_number") ?? searchParams.get("event_round");
    const sessionCode = searchParams.get("session_code");
    const driver = searchParams.get("driver");

    if (!year || !round || !sessionCode || !driver) {
      return NextResponse.json(
        {
          error:
            "Missing required query params: year, round_number/event_round, session_code, driver",
        },
        { status: 400 },
      );
    }

    const qs = new URLSearchParams();
    qs.set("driver", driver);

    const lapNumber = searchParams.get("lap_number");
    const fastest = searchParams.get("fastest");
    const columns = searchParams.get("columns");

    if (lapNumber) qs.set("lap_number", lapNumber);
    if (fastest) qs.set("fastest", fastest);
    if (columns) qs.set("columns", columns);

    const url = `${BACKEND_URL}/sessions/${encodeURIComponent(
      year,
    )}/${encodeURIComponent(round)}/${encodeURIComponent(
      sessionCode,
    )}/telemetry${qs.toString() ? `?${qs.toString()}` : ""}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch session telemetry" },
        { status: res.status },
      );
    }

    const payload = await res.json();
    const data =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: unknown }).data
        : payload;

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 },
    );
  }
}

