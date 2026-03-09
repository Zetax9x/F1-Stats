import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = searchParams.get("year");
    const round =
      searchParams.get("round_number") ?? searchParams.get("event_round");

    if (!year || !round) {
      return NextResponse.json(
        { error: "Missing required query params: year, round_number/event_round" },
        { status: 400 },
      );
    }

    const backendSearch = new URLSearchParams({
      year,
      round_number: round,
    });

    const url = `${BACKEND_URL}/sessions?${backendSearch.toString()}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
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

