"""
F1 Stats Backend - Runs on Oracle Cloud Free Tier.
Now powered by FastF1 (no OpenF1 dependency).
"""
import os
import math
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Literal

import fastf1
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# --- FastF1 cache setup ------------------------------------------------------

DEFAULT_CACHE_DIR = os.path.join(os.path.dirname(__file__), "fastf1-cache")
FASTF1_CACHE_DIR = os.getenv("FASTF1_CACHE_DIR", DEFAULT_CACHE_DIR)
os.makedirs(FASTF1_CACHE_DIR, exist_ok=True)

# Enable FastF1 on-disk cache for performance.
fastf1.Cache.enable_cache(FASTF1_CACHE_DIR)

# CORS: allow frontend (Vercel). Set in .env or default for local dev.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").strip().split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="F1 Stats API",
    description="Backend for F1 Stats – FastF1-based data and analysis",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Health check for Oracle Cloud load balancer / monitoring."""
    return {"status": "ok", "service": "f1-stats-backend"}


SessionCode = Literal["P", "Q", "R", "FP1", "FP2", "FP3", "SQ", "SS"]


@lru_cache(maxsize=32)
def _load_fastf1_session(
    year: int,
    event_round: int,
    session_code: SessionCode,
) -> fastf1.core.Session:
    """
    Load a FastF1 session given season year, event round and session code.
    """
    try:
        session = fastf1.get_session(year, event_round, session_code)
        session.load()
        return session
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"FastF1 load failed: {exc}") from exc


@app.get("/api/fastf1/seasons")
def fastf1_seasons():
    """
    List seasons supported by FastF1.
    """
    current_year = int(os.getenv("FASTF1_MAX_YEAR", "2025"))
    min_year = int(os.getenv("FASTF1_MIN_YEAR", "2018"))
    return [{"year": y} for y in range(current_year, min_year - 1, -1)]


@app.get("/api/fastf1/events")
def fastf1_events(year: int = Query(..., description="Season year, es. 2024")):
    """Return event (meeting) list for a given season year."""
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"FastF1 schedule failed: {exc}") from exc

    events: list[dict] = []
    for _, row in schedule.iterrows():
        rnd = int(row.get("RoundNumber", row.get("Round", 0)) or 0)
        events.append(
            {
                "year": int(year),
                "event_round": rnd,
                "meeting_name": str(row.get("EventName", "")),
                "country_name": str(row.get("Country", "")),
                "circuit_short_name": str(row.get("Location", "")),
                "date_start": str(row.get("EventDate", "")),
            }
        )
    return events


@app.get("/api/fastf1/sessions")
def fastf1_sessions(
    year: int = Query(..., description="Season year, es. 2024"),
    event_round: int = Query(..., description="Event round number in season"),
):
    """
    List sessions for a given event using the event schedule.
    """
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"FastF1 schedule failed: {exc}") from exc

    try:
        event_row = schedule.loc[schedule["RoundNumber"] == event_round].iloc[0]
    except Exception:
        raise HTTPException(status_code=404, detail="Event not found")

    sessions: list[dict] = []
    for idx in range(1, 10):
        name_col = f"Session{idx}"
        date_col = f"Session{idx}Date"
        if name_col not in event_row or not event_row[name_col]:
            continue
        raw_name = str(event_row[name_col])
        name_lower = raw_name.lower()
        if "race" in name_lower:
            code: SessionCode = "R"
        elif "qualifying" in name_lower and "sprint" not in name_lower:
            code = "Q"
        elif "practice 1" in name_lower:
            code = "FP1"
        elif "practice 2" in name_lower:
            code = "FP2"
        elif "practice 3" in name_lower:
            code = "FP3"
        elif "sprint shootout" in name_lower:
            code = "SQ"
        elif "sprint" in name_lower:
            code = "SS"
        else:
            code = "P"

        sessions.append(
            {
                "year": int(year),
                "event_round": int(event_round),
                "session_code": code,
                "session_name": raw_name,
                "date_start": str(event_row.get(date_col, "")),
            }
        )

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for event")

    return sessions


@app.get("/api/fastf1/session-summary")
def fastf1_session_summary(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query(...),
):
    """Return a compact summary of session results per driver."""
    session = _load_fastf1_session(year, event_round, session_code)
    if session.results is None or session.results.empty:
        return []

    df = session.results
    ref_time = None
    if "Time" in df.columns and df["Time"].notna().any():
        try:
            ref_time = df.loc[df["Position"] == 1, "Time"].iloc[0]
        except Exception:
            ref_time = None

    out: list[dict] = []
    for row in df.itertuples():
        drv_number = int(getattr(row, "DriverNumber"))
        pos = int(getattr(row, "Position"))
        name = str(getattr(row, "FullName", getattr(row, "Driver", "")))
        abbrev = str(getattr(row, "Abbreviation", "")) or name.split(" ")[-1][:3].upper()
        status = str(getattr(row, "Status", "")).upper()
        raw_laps = getattr(row, "Laps", 0)
        try:
            laps_val = float(raw_laps)
            laps = int(laps_val) if math.isfinite(laps_val) else 0
        except Exception:
            laps = 0

        gap_to_leader: float | None = None
        if ref_time is not None and getattr(row, "Time", None) is not None:
            try:
                delta = row.Time - ref_time
                candidate = float(delta.total_seconds())
                gap_to_leader = candidate if math.isfinite(candidate) else None
            except Exception:
                gap_to_leader = None

        dnf = "DNF" in status
        dns = "DNS" in status
        dsq = "DSQ" in status

        out.append(
            {
                "year": int(year),
                "event_round": int(event_round),
                "session_code": session_code,
                "driver_number": drv_number,
                "position": pos,
                "gap_to_leader": gap_to_leader,
                "number_of_laps": laps,
                "driver_name": name,
                "driver_abbreviation": abbrev,
                "team_name": str(getattr(row, "TeamName", "")),
                "dnf": dnf,
                "dns": dns,
                "dsq": dsq,
            }
        )

    return out


@app.get("/api/fastf1/laps")
def fastf1_laps(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query(...),
):
    """Return lap data with sector times for a session."""
    session = _load_fastf1_session(year, event_round, session_code)
    laps = session.laps
    if laps is None or laps.empty:
        return []

    out: list[dict] = []

    def _sec(value):
        """Convert a timedelta-like value to seconds, normalizing NaN/inf to None."""
        if value is None:
            return None
        try:
            seconds = float(value.total_seconds())
        except Exception:
            return None
        if not math.isfinite(seconds):
            return None
        return seconds

    for row in laps.itertuples():
        out.append(
            {
                "year": int(year),
                "event_round": int(event_round),
                "session_code": session_code,
                "driver_number": int(getattr(row, "DriverNumber")),
                "lap_number": int(getattr(row, "LapNumber")),
                "lap_duration": _sec(getattr(row, "LapTime", None)),
                "duration_sector_1": _sec(getattr(row, "Sector1Time", None)),
                "duration_sector_2": _sec(getattr(row, "Sector2Time", None)),
                "duration_sector_3": _sec(getattr(row, "Sector3Time", None)),
                "is_pit_out_lap": bool(getattr(row, "IsPitOutLap", False)),
            }
        )

    return out


@app.get("/api/fastf1/telemetry")
def fastf1_telemetry(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query(...),
    driver_number: int = Query(..., description="DriverNumber as used by FastF1"),
):
    """
    Return a simplified telemetry stream (speed/throttle/brake) for a driver.
    """
    session = _load_fastf1_session(year, event_round, session_code)
    laps = session.laps
    if laps is None or laps.empty:
        return []

    drv_laps = laps.loc[laps["DriverNumber"] == driver_number]
    if drv_laps.empty:
        return []

    try:
        best_lap = drv_laps.sort_values("LapTime").iloc[0]
        tel = best_lap.get_car_data()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"FastF1 telemetry failed: {exc}") from exc

    out: list[dict] = []
    max_points = 1000
    step = max(1, len(tel) // max_points)
    for i, row in tel.iloc[::step].iterrows():
        time_value = getattr(row, "Time", getattr(row, "SessionTime", None))
        if time_value is not None:
            t_s = float(time_value.total_seconds())
        else:
            t_s = float(i)
        out.append(
            {
                "time_s": t_s,
                "speed": float(getattr(row, "Speed", 0.0)),
                "throttle": float(getattr(row, "Throttle", 0.0)),
                "brake": float(getattr(row, "Brake", 0.0)),
            }
        )

    return out


@app.get("/api/starting-grid-fastf1")
def starting_grid_fastf1(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query("R", description="Session code, default Race"),
):
    """Starting grid via FastF1 for a given session."""
    session = _load_fastf1_session(year, event_round, session_code)
    if session.results is None or session.results.empty:
        return []

    results = []
    for row in session.results.itertuples():
        results.append(
            {
                "driver_number": int(getattr(row, "DriverNumber")),
                "grid_position": int(getattr(row, "GridPosition", getattr(row, "Position", 0))),
                "finish_position": int(getattr(row, "Position", 0)),
            }
        )
    return results


@app.get("/api/stints-fastf1")
def stints_fastf1(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query("R", description="Session code, default Race"),
):
    """Tyre stints per driver via FastF1."""
    session = _load_fastf1_session(year, event_round, session_code)

    if session.laps.empty:
        return []

    out: list[dict] = []
    laps = session.laps
    for drv, drv_laps in laps.groupby("DriverNumber"):
        for stint, stint_laps in drv_laps.groupby("Stint"):
            out.append(
                {
                    "driver_number": int(drv),
                    "stint_number": int(stint),
                    "compound": str(stint_laps["Compound"].iloc[0]),
                    "lap_start": int(stint_laps["LapNumber"].min()),
                    "lap_end": int(stint_laps["LapNumber"].max()),
                    "tyre_age_at_start": int(stint_laps["TyreLife"].iloc[0])
                    if "TyreLife" in stint_laps.columns and not stint_laps["TyreLife"].isna().all()
                    else None,
                }
            )
    return out


@app.get("/api/pits-fastf1")
def pits_fastf1(
    year: int = Query(...),
    event_round: int = Query(...),
    session_code: SessionCode = Query("R", description="Session code, default Race"),
):
    """Approximate pit stop count per driver via FastF1 stints."""
    session = _load_fastf1_session(year, event_round, session_code)

    if session.laps.empty:
        return []

    laps = session.laps
    out: list[dict] = []
    for drv, drv_laps in laps.groupby("DriverNumber"):
        unique_stints = drv_laps["Stint"].dropna().unique()
        pit_count = max(0, len(unique_stints) - 1)
        out.append({"driver_number": int(drv), "pit_count": int(pit_count)})

    return out


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
