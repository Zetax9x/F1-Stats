"""
F1 Stats Backend - Runs on Oracle Cloud Free Tier.
Proxies to OpenF1 API and will host analysis endpoints.
"""
import os
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

OPENF1_BASE = "https://api.openf1.org/v1"

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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
