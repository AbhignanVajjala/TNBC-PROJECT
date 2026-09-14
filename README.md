# TNBC EXO-RANK

A computational prioritization platform that ranks **TNBC (triple-negative breast cancer) receptor ↔ exosomal-protein** pairs for experimental validation. It integrates three independent evidence layers — AlphaFold-Multimer structure, PRODIGY binding energetics, and STRING prior biology — into a single **Total Prioritization Score (TPS)**, gated by a biological-feasibility filter.

## Repository layout

| Path | Description |
|------|-------------|
| `backend/` | Portable FastAPI backend (bundled data + 200 predicted PDB complexes, hash-verified). Runs offline. |
| `frontend/` | React + Vite + TypeScript UI with a 3Dmol.js molecular viewer, wired to the backend. |
| `scoring/` | Scripts that compute the statistical appendix and scores. |
| `outputs/` | Computed CSVs (scores, normalized features) used by the docs/scoring. |
| `EXO_RANK_*.md` | System overview, technical dossier, diagrams, math & statistics, statistical appendix, relevance & roadmap. |
| `FINAL_*.md`, `*methodology*.md` | Final scoring methodology and results. |
| `TNBC_Receptor_Exosomal_Candidates.xlsx` | Authoritative 20-receptor × Group A/B candidate panel. |

## Running

**Backend** (see `backend/README.md`):
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

**Frontend** (see `frontend/README.md`):
```bash
cd frontend
npm install
npm run dev                       # http://127.0.0.1:3000
```

## Scope

Decision-support / triage: it shrinks and orders the search space; it does **not** prove binding. See `EXO_RANK_RELEVANCE_AND_ROADMAP.md`.
