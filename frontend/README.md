# EXO-TARGET frontend

React, Vite, Tailwind v4 and Express. Express runs locally and through
`api/index.ts` on Vercel. Scientific coordinates stay in the FastAPI backend.

## Local setup and checks

Use Node 22 or later. Start FastAPI as described in `../backend/README.md`, then:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The Express proxy defaults to
`http://127.0.0.1:8000/api` in development. Copy `.env.example` to `.env` and
supply actual values only if needed.

```bash
npm run lint
npm test
npm run build:web
npm run test:http -- http://localhost:3000
```

`test:http` requires running frontend/backend services. It checks health,
interaction identities and PDB content for AF2, AF3 and a three-chain complex,
including coordinate hashes against the repository. Supply a public frontend
URL instead for read-only deployment verification.

## Structures and scientific evidence

Validated uploads take priority for their selected pair, followed by validated
backend PDB coordinates. Failed/missing coordinates show an unavailable state
and retry action. No synthetic coordinates are generated. Uploads stay in
memory for the current app session; refresh clears them. PDB/ENT files are
limited to 8 MB and 60,000 atoms. Only the first MODEL is displayed. Surface
requests above 12,000 atoms show genuine backbone coordinates instead.
Biological chain identities are unverified and never inferred from A/B labels.

`src/data/evidence.json` contains unchanged backend API records and source
SHA-256 hashes. It supports selector/comparison values when metadata is offline;
it contains **no molecular coordinates**. Refresh it after research data updates:

```bash
cd ../backend
python scripts/export_frontend_evidence.py
pytest -q
```

Use the backend Python environment. Snapshot equality is regression-tested.
Missing metrics stay null. Uploads inherit no binding metrics. Kd is converted
only from molar units to nM for display. No scoring formulas change.

## Theme

Both headers expose Light/Dark controls. `ThemeProvider` centralizes state,
`index.html` applies saved settings before first paint, and CSS variables retain
the original light colors. Preference uses `exo-target-theme` in localStorage.
Storage failures fall back to Light. The molecular viewport stays dark and
retains its chain colors in either theme.

## Production connection (manual, approval required)

Keep Vercel's project root as `frontend`, build command `npm run build:web`,
and output directory `dist`. Routes in `vercel.json` are unchanged.

1. Host the complete `backend/` folder, including its 200 structures, on a Python
   service with sufficient disk/RAM. Install `requirements.txt`, verify data,
   and start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. The host must
   supply `PORT`; use `8000` locally. Keep PDBs outside Vercel functions and
   outside the frontend public directory.
2. Verify backend `/api/health`, `/api/system/status`, interaction and structure
   endpoints through HTTPS.
3. Set Vercel's server-only `EXORANK_BACKEND_URL` to that origin **including
   `/api`**, without an interaction path. Production has no implicit loopback
   fallback. Preview and Production environment scopes are configured separately.
4. After approval, deploy the reviewed commit, run `test:http` against its URL,
   and verify its deployed viewer in a browser.

On 20 November 2026 the existing public proxy reported a working connection to
`https://tnbc-project.onrender.com/api`. Credentials and Vercel settings were
not inspected or changed.

AI is optional. Leave `ENABLE_AI_ANALYSIS=false` for unavailable-state behavior.
To enable deliberately, set `ENABLE_AI_ANALYSIS=true`, `GEMINI_API_KEY` and a
valid `GEMINI_MODEL` server-side. Requests use repository evidence, ignore client
scores, validate pairs and reject foreign browser origins. Per-instance limits:
5 requests/IP/hour, 20 total/hour, 2 concurrent calls. For public AI across
serverless instances, configure shared platform rate/budget limits too; memory
limits are not deployment-wide quotas. Provider failures never substitute
favorable analysis.

See `../MAINTENANCE_REPORT.md` for findings, actual validation and limitations.
