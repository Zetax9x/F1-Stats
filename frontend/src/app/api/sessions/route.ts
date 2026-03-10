import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  type SessionCode = "FP1" | "FP2" | "FP3" | "Q" | "R";
  type SessionDto = {
    year: number;
    event_round: number;
    session_code: SessionCode;  // "FP1", "FP2", "FP3", "Q", "R"
    session_name: string;       // "Practice 1", "Qualifying", ...
    date_start: string;         // es. "2026-03-06T12:30:00+11:00"
  };

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

    const url = `${BACKEND_URL}/seasons/${encodeURIComponent(
      year,
    )}/events/${encodeURIComponent(round)}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: res.status },
      );
    }

    const payload = await res.json() as {
      meta?: { year: number, round_number: number };
      data?: Record<string, unknown>;
    };


    const event = payload && typeof payload === "object" && "data" in payload
      ? (payload.data as Record<string, unknown>)
      : (payload as unknown as Record<string, unknown>);
    const eventYear =
      typeof payload.meta?.year === "number"
        ? payload.meta.year
        : Number(year);
    const eventRound =
      typeof payload.meta?.round_number === "number"
        ? payload.meta.round_number
        : Number(round);
        const rawSessions = [
          { idx: 1, code: "FP1" as const },
          { idx: 2, code: "FP2" as const },
          { idx: 3, code: "FP3" as const },
          { idx: 4, code: "Q" as const },
          { idx: 5, code: "R" as const },
        ];
        const sessions: SessionDto[] = rawSessions
          .map(({ idx, code }) => {
            const nameKey = `Session${idx}` as const;
            const dateKey = `Session${idx}Date` as const;
            const sessionName = event[nameKey] as string | undefined;
            const sessionDate = event[dateKey] as string | undefined;
            if (!sessionName || !sessionDate) {
              return null;
            }
            return {
              year: eventYear,
              event_round: eventRound,
              session_code: code,
              session_name: sessionName,
              date_start: sessionDate,
            };
          })
          .filter((s): s is SessionDto => s !== null);
        return NextResponse.json(sessions);
      } catch {
        return NextResponse.json(
          { error: "Backend unreachable" },
          { status: 502 },
        );
      }
    }