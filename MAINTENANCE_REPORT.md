# EXO-TARGET maintenance and reliability report

Date: 20 November 2026 (Asia/Kolkata). Work branch: `fix/exo-target-reliability-theme`.

## Outcome and scope

Implemented locally: authentic coordinate loading, upload precedence and validation,
truthful scientific states, corrected metadata and selection, dependable bundled
3Dmol rendering, optional Light/Dark controls, evidence-preserving export, and AI
failure/usage safeguards. The existing pages, sections, typography, spacing,
cards, tables, controls, chain palette and molecular background are retained.
Some scientific text and numbers intentionally change because they previously
represented fabricated values or unsupported claims.

No changes were made to research datasets, PDB files, the manifest, scoring
formulas, experimental measurements, original pipeline outputs, Vercel routes,
production environment settings or hosting. No push, merge or deployment was
performed. This commit does not update the GitHub remote or live website.

## Architecture and confirmed root causes

The React/Vite frontend calls the same-origin Express application through
`/api/exorank/*`. Locally `server.ts` runs that application plus Vite middleware;
Vercel uses `api/index.ts` and the existing `vercel.json` routes. Express forwards
to FastAPI `/api/interactions/{id}` and `/api/interactions/{id}/structure/pdb`.
FastAPI joins the bundled scientific tables and resolves whitelisted filenames
from `structure_index.csv` under `backend/data/structures/`.

The checkout was clean on `main` before work. Source inspection preceded edits.

| Finding and affected files | Cause and verification | Correction and validation |
| --- | --- | --- |
| Synthetic coordinates shown as AlphaFold results: `AnalysisView.tsx` | `generateHeterodimerPDB()` made artificial coordinates and wrote an AlphaFold header. `getOrCreatePairRecord()` always manufactured a result. The viewer preferred backend data but silently fell back to that result. | Removed both generators and their synthetic registry. Only validated uploads or validated backend PDBs reach the viewer. Otherwise an unavailable/error state appears. Parser, precedence, outage and stale-response tests pass. |
| False loaded/validated badges: `AnalysisView.tsx` | A truthy generic record caused “Real PDB Loaded”; metadata alone caused backend status “live.” | Coordinate request, parsing, renderer readiness and metadata connectivity are separate states. The loaded badge requires parsed coordinates and renderer success. Metadata-only and failed WebGL initialization regression tests pass. |
| CDN initialization race: `index.html`, `AnalysisView.tsx`, old `MolecularViewer.tsx` | Unpinned browser-global initialization used a single delayed retry. Recreated profile objects retriggered viewer work. Cleanup did not own the WebGL instance. The alternate viewer also generated pseudo-atoms and contact vectors. | Replaced both paths with one reusable viewer and lazy, pinned `3dmol@2.5.5`. Initialization waits for the mounted container/library. Structure changes, representation changes and resize are handled separately. Owned global listeners, library observers, scene objects and WebGL contexts are cleaned up. Browser checks show authentic AF2 and AF3 coordinates. |
| Only A/B rendered and labeled biologically: viewer styling, backend viewer hint | Code colored only chains A/B and asserted receptor/scaffold identities. Nine bundled structures actually have A/B/C. | Render every chain, keeping the original A/B colors and adding restrained colors for extra chains. Sequence controls enumerate actual chains. Biological roles stay explicitly unverified. All 200 files were scanned; the HTTP check includes an A/B/C model. |
| Uploads assigned invented metrics and lost priority: `AnalysisView.tsx` | Upload handler constructed confidence, affinity, area, contacts, rank and sequence values; backend PDB won the render fallback expression. | Validate PDB/ENT coordinates before accepting a file; keep uploads keyed by interaction ID in app memory; upload wins over backend, including requests already in flight. Uploads receive no binding metrics. Limits: 8 MB, 60,000 atoms. Invalid and valid upload browser checks and request-race tests pass. |
| Stale state while changing pairs: `App.tsx`, `AnalysisView.tsx`, API client | Prop synchronization duplicated selection state. Metadata was not cleared with the PDB. Presets invoked two selection callbacks. AI results were not associated with a pair. | Use one validated selection, atomic preset changes, pair-keyed metadata/render/AI state, cancellation and generation checks. Late upload/AI/backend results cannot attach to another pair. Back/forward, refresh and rapid-response tests pass. |
| Group B links and history failed: `App.tsx` | URL restoration and receptor changes accepted only Group A; only initial URL was read; navigation replaced history. | Validate against both groups, initialize synchronously from URL/storage, push meaningful navigation history and handle `popstate`. Every one of the 200 candidate selections is tested. Chromium Group B reload/back/forward checks pass. |
| Missing candidate became ANXA2: `App.tsx`, `TargetSelectorView.tsx`, `dataset.ts` | `LIGANDS_DATABASE['anxa2']` was the fallback for missing symbols. | Preserve the selected symbol; fill available UniProt/localization/feasibility from existing backend evidence, otherwise show “Metadata unavailable.” Every candidate is tested, including Group B proteins. |
| Conflicting receptor identities: `dataset.ts` | Five rows had workbook/backend target names but descriptions and UniProt IDs belonging to other proteins. | Correct their accessions and replace mismatched descriptions with neutral panel-specific text. Stable URL IDs and target numbers are preserved. All 200 identity/group mappings agree with backend records. Details below. |
| Invented scientific values: `dataset.ts`, analysis registry | String hashing and unsupported “benchmarks” created favorable scores, hotspots and affinities. Analysis then displayed other hardcoded metrics instead of backend values. | Use unchanged backend values with source provenance. Small checked repository snapshot supports comparisons/offline metadata. Missing values remain null and render “Not calculated.” PS uses the locked pipeline value, rather than the old arbitrary absolute-ΔG scale. Biological feasibility remains categorical. Tests verify exact snapshot equality and missing/upload metrics. |
| Misleading sequence/contact highlighting: analysis registry | Generic or invented sequences and residue contacts were assigned to many pairs. | Derive resolved residue sequences and original residue IDs from loaded ATOM records. Selecting a residue highlights that coordinate selection. No interface-contact identities are claimed or synthesized. Browser selection/highlight and both chain controls were checked. |
| Favorable AI fallback and uncontrolled usage: API client, `server/gemini.ts`, `server/routes.ts` | Both server and browser returned invented favorable geometry/affinity text when no key/provider result existed. Public requests accepted arbitrary payload metrics. | Remove all scientific fallbacks; validate pairs/types/body sizes, derive evidence server-side, require explicit enablement/key/model, reject foreign browser origins and cap per-instance usage/concurrency. Provider/response failures return honest errors. Validation and unavailable-service tests pass. No live provider inference was attempted without credentials. |
| Export preserved fabricated scores: `AnalysisView.tsx`, server dossier route | Export used the synthetic scoring function and claimed a validation dossier. | Frontend exports active coordinate provenance, actual chain/residue metadata, and evidence source. Scientific evidence is null for uploads. Server validates pair identity and returns repository evidence. Browser download action and server export payload tests pass. |
| Production silently assumed a local backend: Express proxy | Development default `127.0.0.1:8000/api` also applied to production. However, this was **not the actual current production failure**: public production health already reported Render. | Require an explicit production API base ending in `/api`; validate its format, return 503 for absent configuration, preserve 404 for missing data and 502 for upstream/invalid-content failures. Local and existing-production HTTP checks pass. No hosting changes needed to demonstrate retrieval. |
| Manifest check failed on Windows: verifier | `core.autocrlf=true` expanded newlines in 155 AF2 PDBs, causing 310 size/hash complaints. The LF-normalized bytes exactly match the existing manifest. | Accept only that exact CRLF expansion when both canonical size and SHA-256 match. Report the count explicitly; do not rewrite data/manifest. A coordinate-change regression test still fails verification as intended. Final verification passes. |
| Health claimed integrity from existence alone: `/api/system/status` | “verified” previously meant files existed, without checking their hashes; resolved count used index flags. | Cache actual manifest verification keyed by file timestamps/sizes and count resolvable paths. Structure metadata also checks actual disk availability. Missing-file and integrity tests pass. |
| No shared theme: both headers and hardcoded analysis colors | Theme tokens and many literal analysis colors had no centralized state. | Add a shared provider and keyboard-accessible explicit Light/Dark controls. Preserve original light literals as CSS variable defaults and provide forest/charcoal dark overrides. Storage/bootstrap details below. Browser checks pass. |

### Receptor identity corrections

The authoritative candidate workbook and backend agree on target numbers and
display identities. Existing URL IDs remain aliases, even where their names
are historical and confusing:

| Target | Retained URL ID | Correct displayed protein | Correct UniProt |
| --- | --- | --- | --- |
| 10 | `cd44v6` | GPNMB | Q14956 |
| 11 | `folr1` | LIV-1 / SLC39A6 | Q13433 |
| 12 | `gpnmb` | PD-L1 / CD274 | Q9NZQ7 |
| 13 | `enpp1` | CD44 | P16070 |
| 16 | `ptk7` | ROR1 | Q01973 |

Accession references: [GPNMB](https://www.uniprot.org/uniprotkb/Q14956/entry),
[SLC39A6](https://www.uniprot.org/uniprotkb/Q13433/history),
[PD-L1](https://rest.uniprot.org/uniprotkb/Q9NZQ7.txt),
[CD44](https://www.uniprot.org/uniprotkb/P16070/entry),
[ROR1](https://www.uniprot.org/uniprotkb/Q01973/entry).
No detailed new biological mechanism was invented for the corrected rows.

## Structural data verification

| Check | Result |
| --- | --- |
| Indexed interactions / unique indexed filenames | 200 / 200 |
| Bundled PDB files | 200 |
| Missing indexed files / unmapped PDBs | 0 / 0 |
| AlphaFold2-Multimer / AlphaFold3 | 155 / 45 |
| Successfully parsed / failed | 200 / 0 |
| First-model coordinate records parsed | 1,952,201 |
| Chains A/B / chains A/B/C | 191 / 9 |
| Canonical PDB bytes from original manifest | 159,087,179 |
| Working-tree bytes after Windows newline expansion | 160,152,609 |
| Repository metadata snapshot | 448,964 bytes; no coordinates |

A/B/C structures: `T6_FN1`, `T6_MFGE8`, `T6_THBS1`, `T6_ITGB1`, `T6_ITGA6`,
`T6_PGK1`, `T6_ALDOA`, `T6_LDHA`, `T6_ENO1`. The index does not contain
sequence-verified biological chain assignments. No chain-role validation or
binding-geometry validation is claimed, including for uploads.

Read-only HTTP verification at approximately 18:29 IST on 20 November 2026:

| Pair | Model | Atoms / chains | Local metadata/PDB | Existing production metadata/PDB |
| --- | --- | --- | --- | --- |
| T1_ANXA2 | AF2-Multimer | 2,939 / A,B | 200 / 200 | 200 / 200 |
| T1_FN1 | AF3 | 21,281 / A,B | 200 / 200 | 200 / 200 |
| T6_MFGE8 | AF3 | 16,250 / A,B,C | 200 / 200 | 200 / 200 |

Both `/api/exorank/health` checks returned 200 JSON with `connected:true`.
All PDB responses used `chemical/x-pdb; charset=utf-8`; coordinate hashes
matched repository files after newline normalization. The production endpoint
was [the existing Vercel deployment](https://tnbc-project-iota.vercel.app/),
which reported `https://tnbc-project.onrender.com/api` as its upstream during
initial inspection. Environment credentials/settings were not directly read.
Production retrieval was verified; the repaired viewer has **not** been
deployed or tested in production.

The production HTML still loads the CDN `3Dmol/2.0.4/3Dmol-min.js` script and
has no `exo-target-theme` bootstrap. The local build instead bundles 3Dmol 2.5.5
and initializes the saved theme before first paint. This directly confirms that
the repaired frontend differs from the current deployed version; no full visual
production comparison is claimed.

## Theme and visual verification

`ThemeProvider` owns the shared preference. The `exo-target-theme` localStorage
key stores `light` or `dark`. An inline bootstrap in `index.html` applies the
saved value before React/CSS first paint. Defaults remain Light. Blocked
storage is handled. Storage events synchronize open tabs. Theme updates do not
change selection, upload association or molecular coordinates.

The original light hex colors are the variable defaults. Dark overrides use
forest/charcoal surfaces, light warm text, terracotta and sage accents. Controls,
cards, tables, borders and modal surfaces retain their original dimensions and
design. No inversion filters or alternate layouts were introduced. The molecular
viewport and chain palette stay dark in both themes.

Chromium screenshots were visually inspected for the light analysis and dark
analysis/selector layouts. Desktop, 390 px and 320 px checks found no page-level
horizontal overflow; narrow-view select/header controls remained within the
viewport. This is visual inspection, not a pixel-perfect production screenshot
comparison or a formal contrast certification. Tables retain their intended
internal horizontal scrolling.

## Commands and actual results

Commands were executed from `frontend/` or `backend/` as indicated. This machine
had Node but no npm launcher on PATH; npm 10.9.2's official registry CLI was run
through Node from a temporary directory. The commands below are their standard
npm equivalents, not different build/test implementations.

| Directory | Command | Result |
| --- | --- | --- |
| frontend | `npm ci` | PASS initially and again with final dependency lock; final install audited 227 packages with 0 vulnerabilities |
| frontend | `npm run lint` | PASS; TypeScript no emit |
| frontend | `npm test` | PASS: 16 tests, 0 failures |
| frontend | `npm run build:web` | PASS; Vite production web build |
| frontend | `npm audit` | PASS: 0 known vulnerabilities |
| frontend | `npm run test:http -- http://localhost:3000` | PASS: health and three metadata/PDB pairs; types, identities and coordinate hashes checked |
| frontend | `npm run test:http -- https://tnbc-project-iota.vercel.app` | PASS: same checks on existing deployment |
| backend | `python scripts/verify_data.py` | PASS: 15 data files, 200 structures; 155 exact CRLF expansions reported |
| backend | `pytest -q` | PASS: 21 tests, 0 failures |
| backend | `python -m pip check` | PASS: no broken requirements |
| repository | `git diff --check` | PASS after removing two whitespace-only lines |

The backend commands used `backend/.venv312/Scripts/python.exe`. A normal
Python 3.14 virtual environment installed requirements but Windows Application
Control blocked its downloaded native Pydantic DLL. A separate Python 3.12.14
venv used the trusted bundled native libraries through system site packages,
with FastAPI/pytest and application dependencies installed in that environment.
No Windows policy/settings were changed. Versions included Pydantic 2.14.3,
pandas 3.0.1 and FastAPI 0.165.0.

One intermediate `npm ci` failed because the running Vite process held a native
CSS binary open. The owned dev server was stopped and clean installation was
rerun successfully. These intermediate failures are not reported as passes.

Regression coverage includes all 200 mappings/filenames/parses, both model
types, invalid/oversized content, upload priority, cancelled/stale responses,
missing metadata, metadata-only responses, absent/upload metrics, malformed API
metadata, Group B URL restoration, theme persistence, proxy status codes,
AI input/unavailability, server dossier payloads, timeout/missing/retry behavior,
and viewer initialization failure without a browser/WebGL environment.

Interactive Chromium checks additionally covered AF2 and AF3 rendering,
cartoon/surface/stick switching, large-surface fallback, reset/fit/zoom controls,
actual sequence-chain selection and residue highlighting, valid/invalid uploads,
upload retention while switching pairs, comparison modal open/Escape close,
matrix switching, export download action, theme changes, refresh and browser
back/forward. Console error inspection was clear during representative rendering.
Expected aborted-request warning noise was subsequently removed.

### Verification limits and retained warnings

- Firefox UI verification could not complete: the computer-use tool stopped
  because its URL policy enforcement does not support this Windows Firefox
  session. No Firefox pass is claimed.
- No native mobile touch hardware test was performed. Mouse controls and the
  responsive viewport were checked; native 3Dmol touch interaction is retained.
- Timeout, backend-failure, missing-structure and absent-WebGL paths are tested
  programmatically. Browser WebGL was not deliberately disabled, and a real
  network-throttling browser test was not performed.
- No live paid AI call was made. Distributed/public AI usage should be governed
  by platform-wide limits before enabling it; per-instance memory counters reset
  on serverless cold starts and are not a global budget guarantee.
- Builds retain 3Dmol's upstream `eval` warning and warnings for chunks over
  500 kB. The molecular library is lazy-loaded (about 169 kB gzip); the main
  application is about 147 kB gzip. No custom eval or CSP relaxation was added.
- React's hook-test renderer and Starlette's existing httpx TestClient emit
  deprecation warnings. Tests pass; neither warning is a research result.
- The existing descriptive educational copy was preserved except for identified
  identity/scientific-result defects; this was not an exhaustive literature or
  clinical-claim review.

## Changed-file inventory

| File | Reason |
| --- | --- |
| `.gitignore` | Exclude local validation environments/caches and browser-test outputs. |
| `backend/README.md` | Remove unsupported universal A/B biological chain assignment. |
| `backend/app/api/routes/system.py` | Verify manifest hashes and count resolvable structures. |
| `backend/app/data/repositories/interaction_repository.py` | Assert exact interaction identity at the structure-index join. |
| `backend/app/services/structure_service.py` | Disk-backed availability and honest chain hint. |
| `backend/app/utils/integrity.py` | Cached integrity checks and exact CRLF expansion recognition. |
| `backend/scripts/verify_data.py` | Reuse rigorous checks, report newline expansions without altering data. |
| `backend/scripts/export_frontend_evidence.py` | Reproducibly export unchanged records/source hashes. |
| `backend/tests/test_reliability.py` | Seven added tests, including parameterized AF2/AF3 retrieval. |
| `frontend/.env.example` | Document explicit backend/optional AI settings without credentials. |
| `frontend/README.md` | Local setup, validation, provenance, limits and manual deployment steps. |
| `frontend/index.html` | Remove CDN script; apply saved theme before first paint. |
| `frontend/package.json` | Pinned 3Dmol, minimal hook-test dependencies, test/HTTP scripts, patched qs override. |
| `frontend/package-lock.json` | Reproducible dependency and security patch resolution. |
| `frontend/server/app.ts` | Bound JSON body size and JSON API 404s. |
| `frontend/server/gemini.ts` | Evidence-limited optional provider call; remove fabricated defaults/fallbacks. |
| `frontend/server/routes.ts` | Validated proxy content/statuses, pair validation, truthful export and AI safeguards. |
| `frontend/server/scientificBackend.ts` | Validated API-base configuration and no implicit production loopback. |
| `frontend/scripts/verify-http.ts` | Reproducible read-only local/deployed retrieval/hash checks. |
| `frontend/src/3dmol.d.ts` | Type declarations for the pinned ESM bundle entry. |
| `frontend/src/App.tsx` | Central selection/history and pair-keyed in-memory uploads. |
| `frontend/src/components/AnalysisView.tsx` | Remove fake registry/results, integrate provenance/viewer/upload/state repairs while retaining page structure. |
| `frontend/src/components/Header.tsx` | Shared theme switcher and scientific-backend connectivity indicator. |
| `frontend/src/components/MolecularViewer.tsx` | Replace unused synthetic canvas implementation with genuine owned 3Dmol rendering. |
| `frontend/src/components/TargetSelectorView.tsx` | Correct candidate identity, real repository TPS, theme-compatible surfaces. |
| `frontend/src/components/ThemeSwitcher.tsx` | Shared provider and explicit accessible theme controls. |
| `frontend/src/data/dataset.ts` | Correct identity metadata; replace hash scores and wrong-protein fallbacks with evidence-backed accessors. |
| `frontend/src/data/evidence.json` | Small derived scientific-record snapshot with provenance/hash inventory. |
| `frontend/src/hooks/usePairStructure.ts` | Cancellable validated requests, upload precedence, state isolation and retry. |
| `frontend/src/index.css` | Preserve light palette, add dark variables, viewer sizing and narrow-screen adaptations. |
| `frontend/src/lib/pairProfile.ts` | Evidence-only display model and null-safe precision-preserving formatting. |
| `frontend/src/lib/pdb.ts` | Bounded response reading, coordinate validation, actual chain/residue parsing and precedence. |
| `frontend/src/lib/selection.ts` | Shared case-insensitive Group A/B URL/storage validation. |
| `frontend/src/lib/theme.ts` | Safe preference persistence helpers. |
| `frontend/src/services/api.ts` | Honest AI errors, validated metadata/PDB responses, abort/timeouts. |
| `frontend/src/types.ts` | Explicit nullable scientific measurements. |
| `frontend/test/core.test.ts` | Mapping, all-file parsing, scientific integrity, configuration, metadata, theme and selection regression tests. |
| `frontend/test/server.test.ts` | Proxy, export and AI request regression coverage. |
| `frontend/test/structure.test.tsx` | Upload/race, metadata-only, timeout/retry and renderer-failure tests. |
| `MAINTENANCE_REPORT.md` | Findings, actual verification, interpretation risks and review/deployment record. |

New runtime dependency: `3dmol@2.5.5`, replacing the CDN and synthetic viewers.
New development-only dependencies: `react-test-renderer@19.0.1` and
`@types/react-test-renderer@19.0.0`, using Node's existing test runner/tsx to
exercise hook races. Patch-level dependency resolution was refreshed to remove
the initial five audit findings; qs is explicitly overridden to patched 6.17.1.
Vite remains major version 6 (resolved 6.4.6). No additional state/UI framework,
third-party structure service or structure copy was introduced.

## Deployment and review implications

Diff scope: 40 files, primarily removal of generated coordinates/results,
addition of bounded loading/provenance helpers and tests, and color-variable
substitution in the existing JSX. No research-data or scoring-output files are
in the diff; no new page or dashboard section is added.

The smallest reliable serving arrangement is the existing FastAPI backend.
Three authentic production files are already retrievable from that arrangement.
Keep the roughly 159 MB PDB collection there; this patch adds only metadata to
the frontend. See `frontend/README.md` for complete manual hosting, environment
scope, build and post-deployment verification instructions.

The production variable must be a reachable API base, e.g.
`EXORANK_BACKEND_URL=https://tnbc-project.onrender.com/api`, if that backend
remains the intended host. It is a server-only variable, not `VITE_*`. Configure
only after reviewing the actual hosting account; this observed public URL is
not proof of ownership or a request to change it. Existing Vercel project root,
routes, build command and output directory are preserved.

Scientific interpretation changes to review: displayed rankings/confidences now
reflect repository evidence rather than synthetic favorable numbers; upload
metrics become unavailable; invented contacts/geometry and favorable AI fallback
claims disappear; BS is categorical; historical URL IDs map to corrected protein
identities; additional chains remain visible and unlabeled biologically. The
underlying methodology and data remain unchanged. Any future research-data
update should regenerate and verify the frontend evidence snapshot deliberately.

The commit is ready for local review. Publishing, pushing and deploying require
the separate explicit approval requested in the task; no deployed repair is
claimed in this report.
