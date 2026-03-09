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
    const driver = searchParams.get("driver");
    const lapMin = searchParams.get("lap_min");
    const lapMax = searchParams.get("lap_max");
    const fastestOnly = searchParams.get("fastest_only");

    if (driver) qs.set("driver", driver);
    if (lapMin) qs.set("lap_min", lapMin);
    if (lapMax) qs.set("lap_max", lapMax);
    if (fastestOnly) qs.set("fastest_only", fastestOnly);

    const url = `${BACKEND_URL}/sessions/${encodeURIComponent(
      year,
    )}/${encodeURIComponent(round)}/${encodeURIComponent(
      sessionCode,
    )}/laps${qs.toString() ? `?${qs.toString()}` : ""}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch session laps" },
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

