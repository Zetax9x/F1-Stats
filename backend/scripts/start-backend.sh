#!/bin/bash
# Avvia il backend F1 Stats (da usare sulla VM Oracle Cloud).
# Uso: ./scripts/start-backend.sh   oppure   bash scripts/start-backend.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -d ".venv" ]; then
  echo "Creo ambiente virtuale..."
  python3 -m venv .venv
fi

source .venv/bin/activate

if [ ! -f ".env" ]; then
  echo "Crea il file .env (vedi .env.example) con CORS_ORIGINS e opzionale PORT."
  exit 1
fi

set -a
source .env
set +a

pip install -q -r requirements.txt
PORT=${PORT:-8000}
echo "Backend in ascolto su http://0.0.0.0:${PORT}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
