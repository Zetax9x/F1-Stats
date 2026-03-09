"""
F1 Stats Backend - Runs on Oracle Cloud Free Tier.
Proxies to OpenF1 API and will host analysis endpoints.
"""
import os
from contextlib import asynccontextmanager
from functools import lru_cache

import fastf1
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

OPENF1_BASE = "https://api.openf1.org/v1"

# Enable FastF1 on-disk cache for performance.
fastf1.Cache.enable_cache(os.path.join(os.path.dirname(__file__), "fastf1-cache"))

# CORS: allow frontend (Vercel). Set in .env or default for local dev.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").strip().split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="F1 Stats API",
    description="Backend for F1 Stats – proxies OpenF1 and analysis",
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


@app.get("/api/sessions")
async def get_sessions(
    year: int | None = Query(None),
    country_name: str | None = Query(None),
    session_name: str | None = Query(None),
):
    """Proxy to OpenF1 sessions. Frontend calls this instead of OpenF1 directly."""
    params = {}
    if year is not None:
        params["year"] = year
    if country_name:
        params["country_name"] = country_name
    if session_name:
        params["session_name"] = session_name
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{OPENF1_BASE}/sessions", params=params)
        r.raise_for_status()
        return r.json()


@app.get("/api/meetings")
async def get_meetings(
    year: int | None = Query(None),
    country_name: str | None = Query(None),
):
    """Proxy to OpenF1 meetings."""
    params = {}
    if year is not None:
        params["year"] = year
    if country_name:
        params["country_name"] = country_name
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{OPENF1_BASE}/meetings", params=params)
        r.raise_for_status()
        return r.json()


@app.get("/api/openf1/{path:path}")
async def proxy_openf1(path: str, request: Request):
    """Generic proxy: GET /api/openf1/laps?session_key=123 -> OpenF1 laps."""
    query = str(request.url.query)
    url = f"{OPENF1_BASE}/{path}"
    if query:
        url += "?" + query
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


@lru_cache(maxsize=16)
def _load_fastf1_race(session_key: int):
    """Resolve OpenF1 session_key to year/meeting, then load FastF1 race session."""
    params = {"session_key": session_key}
    resp = httpx.get(f"{OPENF1_BASE}/sessions", params=params, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Session not found in OpenF1")
    meta = data[0]
    year = int(meta["year"])
    meeting_name = meta["meeting_name"]
    # Always load race for that meeting; FastF1 session identifier 'R' for Race.
    session = fastf1.get_session(year, meeting_name, "R")
    session.load()
    return session


@app.get("/api/starting-grid-fastf1")
def starting_grid_fastf1(session_key: int = Query(..., description="OpenF1 session_key for the race")):
    """Starting grid via FastF1, resolved from OpenF1 session_key."""
    try:
        session = _load_fastf1_race(session_key)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"OpenF1 lookup failed: {e}") from e
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(e)) from e

    results = []
    for row in session.results.itertuples():
        # FastF1 names: DriverNumber, GridPosition, Position
        results.append(
            {
                "driver_number": int(row.DriverNumber),
                "grid_position": int(row.GridPosition),
                "finish_position": int(row.Position),
                "session_key": int(session.session_key),
                "meeting_key": int(session.event["EventFormat"].get("meeting_key", 0))
                if isinstance(session.event, dict) and "EventFormat" in session.event
                else None,
            }
        )
    return results


@app.get("/api/stints-fastf1")
def stints_fastf1(session_key: int = Query(..., description="OpenF1 session_key for the race")):
    """Tyre stints per driver via FastF1."""
    try:
        session = _load_fastf1_race(session_key)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"OpenF1 lookup failed: {e}") from e
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(e)) from e

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
def pits_fastf1(session_key: int = Query(..., description="OpenF1 session_key for the race")):
    """Approximate pit stop count per driver via FastF1 stints."""
    try:
        session = _load_fastf1_race(session_key)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"OpenF1 lookup failed: {e}") from e
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(e)) from e

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
