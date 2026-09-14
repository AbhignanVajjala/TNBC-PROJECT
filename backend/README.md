# EXO-RANK Backend API — Portable, Self-Contained

## What this is
REST backend for the **TNBC targeted-exosome computational prioritization** platform (EXO-RANK).
It serves the structural + scoring evidence for each receptor–candidate interaction so a separate
frontend (molecular viewer + dashboards) can consume it.

> **Scientific integrity.** Computational *prioritization* only — no claim of experimental binding.
> AlphaFold → structural confidence; PRODIGY → predicted energetics; STRING → prior biological/network
> association; **TPS → integrated priority for experimental validation.**

## ⭐ Portability
**This entire `backend/` folder is a self-contained application package.** Copy it to any computer /
any directory and it runs — it bundles its own scientific data and PDB structures and uses **only paths
relative to the backend root** (resolved via `pathlib`, independent of the current working directory).
No dependency on the original project, no machine-specific absolute paths, no internet required at runtime.

## Folder structure
```
backend/
├── app/
│   ├── main.py                     # FastAPI app: CORS, error handlers, routers, startup load
│   ├── config.py                   # ALL paths resolve from backend root (portable)
│   ├── api/routes/                 # health, system, interactions, structures, receptors, candidates, shortlist
│   ├── api/schemas/models.py       # Pydantic response contract (drives Swagger)
│   ├── services/                   # interaction / structure / aggregate logic
│   ├── data/loaders/               # read-only ingestion of bundled data
│   ├── data/repositories/          # normalized in-memory interaction records
│   └── utils/errors.py             # centralized error format
├── data/                           # ← bundled, self-contained data
│   ├── raw/                        #   immutable scientific source files (CSV/XLSX)
│   ├── processed/structure_index.csv   #   interaction_id → PDB mapping
│   ├── structures/                 #   200 bundled .pdb files
│   └── MANIFEST.json               #   inventory + SHA-256 of every bundled file
├── scripts/
│   ├── build_structure_index.py    # rebuild the interaction→PDB index from bundled data
│   ├── build_manifest.py           # (re)generate MANIFEST.json
│   ├── verify_data.py              # integrity check → PASS/FAIL
│   ├── setup.sh / setup.ps1        # one-command setup (Linux/macOS · Windows)
├── tests/                          # pytest suite (incl. end-to-end)
├── docs/API.md                     # full API contract
├── requirements.txt · .env.example · README.md
```
- **`data/raw`** = raw scientific data (never modified). **`data/processed`** = derived API-ready data.
  **`data/structures`** = PDB files. Original filenames are preserved (provenance kept in the index).

## Installation
**Windows (PowerShell)**
```powershell
cd backend
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# or manually:
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
**Linux / macOS**
```bash
cd backend
bash scripts/setup.sh
# or manually:
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```
`.env` is optional — sensible defaults work out of the box. Copy `.env.example` → `.env` to customize.

## Running
```bash
uvicorn app.main:app --reload
```
- API base: `http://127.0.0.1:8000/api`
- Swagger UI: `/api/docs` · ReDoc: `/api/redoc` · OpenAPI JSON: `/api/openapi.json`

## Testing
```bash
pytest -q                    # 13 tests: health, list/filter/paginate, join, missing-data,
                             # scores, evidence, structure meta, PDB retrieval, 404, CORS, e2e
```

## Data verification
```bash
python scripts/verify_data.py    # checks files exist, SHA-256 matches MANIFEST, all
                                 # interactions load, every interaction maps to an existing PDB
```
Prints **PASS** / **FAIL** and lists any missing/corrupted resource.

## API endpoints
| method | path | purpose |
|---|---|---|
| GET | `/api/health` | liveness + counts |
| GET | `/api/system/status` | data dir / interactions / PDBs / manifest integrity |
| GET | `/api/interactions` | list + filter + sort + paginate |
| GET | `/api/interactions/{id}` | full interaction record |
| GET | `/api/interactions/{id}/scores` | AFS/PS/SS/TPS with provenance |
| GET | `/api/interactions/{id}/evidence` | PRODIGY + STRING + BS evidence |
| GET | `/api/interactions/{id}/structure` | structure metadata |
| GET | `/api/interactions/{id}/structure/pdb` | raw PDB for Mol*/3Dmol.js/NGL |
| GET | `/api/receptors` · `/api/candidates` · `/api/shortlist` | aggregates |

Filters on `/api/interactions`: `receptor`, `candidate`, `group` (A/B), `bs`, `preferred`,
`min_coverage` (1–3), `sort_by`, `order`, `limit` (1–500), `offset`. Join key = **Target No. + Protein**;
interaction id = `T{target}_{PROTEIN}` (e.g. `T6_MFGE8`).

## PDB access (for the frontend)
`GET /api/interactions/{id}/structure/pdb` streams the **locally bundled** PDB (media type
`chemical/x-pdb`; `?download=true` forces attachment). Load the text into Mol*/3Dmol.js/NGL.
Chain **A = receptor**, chain **B = candidate**. The frontend never needs a filesystem path — only the API URL.

## Frontend connection
1. Set `FRONTEND_URL` (comma-separated origins) for CORS — works with React/Next.js/Vite unchanged.
2. List/filter `/api/interactions`, open `/api/interactions/{id}`, fetch its `/structure/pdb`.
3. Every block carries a `provenance` entry (source file) for on-screen scientific traceability.

## Missing data
Never zero-filled: missing PRODIGY/STRING/AlphaFold metric → `null`; missing structure →
`pdb_available:false`. Coverage reflects actual availability.

## Portability statement
The `backend/` directory is intended to be **copied as a single self-contained unit**. It contains all
API code, schemas, scripts, tests, documentation, **scientific data (`data/raw`), PDB structures
(`data/structures`), the structure index, and a hash-verified manifest.** Verified by copying the folder
outside the original project and running install → verify → start → serve → tests successfully.
