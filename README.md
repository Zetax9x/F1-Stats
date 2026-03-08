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
   - `NEXT_PUBLIC_API_URL` = your Oracle Cloud backend URL (e.g. `https://your-app.online.oraclecloud.com`).

### Backend → Oracle Cloud

1. Create a VM (e.g. Ubuntu) on Oracle Cloud Free Tier.
2. Install Python 3.10+, copy `backend/` and run:
   - `pip install -r requirements.txt`
   - Set `CORS_ORIGINS` to your Vercel URL(s), e.g. `https://f1-stats.vercel.app`
   - Run with `uvicorn main:app --host 0.0.0.0 --port 8000` (or use `PORT` from the environment).
3. Open port 8000 in the VM firewall / security list.
4. (Optional) Put a reverse proxy (nginx) in front and use HTTPS.

After deploy, set `NEXT_PUBLIC_API_URL` in Vercel to the public URL of your backend so frontend and backend talk.
