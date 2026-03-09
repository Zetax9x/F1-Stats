# F1 Stats

Frontend (Vercel) + Backend (Oracle Cloud Free Tier). Data from OpenF1 API.

## Structure

- **`frontend/`** – Next.js app → deploy to **Vercel**
- **`backend/`** – FastAPI app → run on **Oracle Cloud Free Tier**
- **`openf1/`** – OpenF1 repo (reference, future ingestor)
- **`fastf1/`** – FastF1 repo (reference, analysis)

## Run locally (both together)

### 1. Backend (Oracle-style: one terminal)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # edit CORS_ORIGINS if needed
python main.py
```

Backend: **http://localhost:8000**  
Docs: http://localhost:8000/docs

### 2. Frontend (second terminal)

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Frontend: **http://localhost:3000** – it will call the backend for sessions and health.

## Deploy

### Frontend → Vercel

1. Push `frontend/` to GitHub (or connect Vercel to the repo and set root to `frontend`).
2. In Vercel project settings, add env var:
   - **`BACKEND_URL`** = `http://92.4.172.23:8000` (il tuo IP Oracle, porta 8000).  
   Il frontend chiama `/api/health` e `/api/sessions` (stessa origine); il server Vercel fa da proxy verso il backend HTTP, così il browser non blocca per mixed content (HTTPS → HTTP).

### Backend → Oracle Cloud

Guida passo-passo: **[docs/ORACLE-CLOUD-SETUP.md](docs/ORACLE-CLOUD-SETUP.md)** (creazione VM, apertura porta 8000, installazione, systemd).

In sintesi: crea una VM Ubuntu su Oracle Cloud Free Tier, apri la porta 8000 nella Security List, copia il `backend/` sulla VM, crea `.env` con `CORS_ORIGINS` (URL Vercel), avvia con `./scripts/start-backend.sh` o con il servizio systemd. Imposta poi `NEXT_PUBLIC_API_URL` su Vercel con l’IP pubblico della VM (es. `http://132.145.xxx.xxx:8000`).
