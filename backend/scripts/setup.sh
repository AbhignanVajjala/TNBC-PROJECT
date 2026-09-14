#!/usr/bin/env bash
# Portable one-command setup for the EXO-RANK backend (Linux/macOS).
# Run from the backend/ directory:  bash scripts/setup.sh
set -e
cd "$(dirname "$0")/.."          # backend/

echo "[1/4] Creating virtual environment (.venv)"
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

echo "[2/4] Installing dependencies"
pip install --upgrade pip >/dev/null
pip install -r requirements.txt

echo "[3/4] Preparing data (env + index + manifest)"
[ -f .env ] || cp .env.example .env
python scripts/build_structure_index.py
python scripts/build_manifest.py

echo "[4/4] Verifying data integrity"
python scripts/verify_data.py

echo
echo "Setup complete. Start the API with:"
echo "  source .venv/bin/activate && uvicorn app.main:app --reload"
