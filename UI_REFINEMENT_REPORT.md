# EXO-TARGET UI refinement

Validated November 23, 2026 against main commit `296a4475306a297a3e7c3dc5a62a75bbfdb4faa8`.

## Changes

The previous dark theme used similar, low-contrast surfaces throughout. The refined theme separates the neutral charcoal page, header, primary cards, recessed selector panels, inputs, and comparison dialog. Borders, score bars, muted text, active navigation, focus indicators, and the terracotta action have clearer contrast. The page structure, original hero, fonts, and scientific methodology are retained.

The same treatments cover the analysis cards, viewer metadata, sequence, comparison tables, and export section. Comparison selectors and scores now remain within their cards; mobile controls wrap, tables scroll within their containers, and the dialog contains scrolling, locks background scrolling, and restores focus. Reduced-motion preferences apply to scrolling and animation. The viewer keeps genuine coordinates and chain identifiers, with a neutral dark background and a brighter first-chain color matched by its swatch.

The light palette and desktop layout are preserved. Baseline screenshot comparison found identical hero and detail-region pixels before the two targeted light-mode metadata contrast corrections. Small-screen overflow corrections apply to both themes.

## Science API investigation

The original 4.5-second frontend timeout was shorter than the proxy's 15-second upstream budget. Holding only the deployed health response for six seconds reproduced the old false Offline indicator. All four real production endpoints were healthy during investigation, returning HTTP 200 in approximately 0.45 to 0.88 seconds. A historical cold start is plausible, but was not established as the cause of the supplied screenshot.

Health checks now allow 18 seconds and distinguish connecting, available, temporarily unavailable, and confirmed unavailable. The first two failures retry after 5 and 15 seconds; three consecutive failures confirm unavailability. Further checks run 60 seconds after completion, recover automatically, avoid overlap, and abort on unmount. Endpoint reachability never substitutes for per-structure loading and rendering checks.

## Metadata and copy

HTML, Open Graph, Twitter and JSON titles use `EXO-TARGET | TNBC Target Prioritization`. A minimal SVG favicon was added. Visible em-dash placeholders use N/A, and evidence-derived and generated prose is normalized at display boundaries. The original evidence snapshot remains byte-unchanged. Misleading docking/simulation and preloaded-structure claims in the selector were replaced with predicted-structure and evidence-inspection wording. TPS values and calculations are unchanged.

## Validation

- Frontend: `npm ci`, `npm run lint`, `npm test` (22 passed), and `npm run build:web` passed.
- Backend: `python scripts/verify_data.py` passed for 200 interactions, 200 structures and 15 source files; `pytest -q` passed all 21 tests.
- The backend's existing snapshot test initially failed on 55 interface-PAE floats differing by one IEEE-754 rounding step across parser runtimes. Its comparison now permits one ULP only for finite float leaves while keeping keys, types, strings, hashes, and other values exact. No snapshot or source scientific values were regenerated.
- Chromium screenshots and interaction checks cover both themes at 1440, 390 and 320 CSS pixels, selector, analysis, real WebGL rendering, dropdowns, theme persistence, comparison dialog and internal table scrolling. There were no uncaught browser errors or document-width overflow in those checks.
- Both themes were checked at actual Chrome 125% page zoom using its Appearance setting, with devicePixelRatio 1.25 and a 1138 CSS-pixel viewport. The selector, analysis and dialog fit without document-width overflow.
- Axe WCAG A/AA scans found zero violations on selector, analysis and comparison dialog in both themes. This is an automated check, not a claim of complete accessibility conformance.
- Production-build interaction checks passed for actual light/dark switching across refresh, keyboard focus, all three molecular representations, camera controls, residue highlighting, JSON dossier download, modal focus trapping/restoration, and structure-failure retry. Controlled health probes confirmed temporary failure, three-failure unavailability, and automatic recovery; a separate six-second successful response remained Connecting at five seconds and became Online afterward.
- Source evidence, PDB files, scoring outputs and research calculations have no changes.

## Contributor audit and remaining limitations

GitHub's public contributor API lists only AbhignanVajjala and Phani347-06. Historical commit [d17847f](https://github.com/AbhignanVajjala/TNBC-PROJECT/commit/d17847f04e09f89e1b772887c52035f380153a55) has Phani347-06 as author and committer and contains the specified Claude coauthor trailer. No current editable contributor listing needed removal. An ordinary new commit cannot remove that historical trailer; published history and human attribution were preserved. No new AI coauthor trailers were added.

Existing build warnings concern 3Dmol's eval use and large bundled chunks. Backend tests emit an existing Starlette/httpx deprecation warning. No AI-provider request was made during visual verification; configured provider access remains environment-dependent. Browser molecular rendering was verified with software WebGL, which does not establish performance on every graphics device.

## Files

`frontend/index.html`, `frontend/metadata.json`, `frontend/public/favicon.svg`, `frontend/src/App.tsx`, `frontend/src/components/{Header,TargetSelectorView,AnalysisView,MolecularViewer}.tsx`, `frontend/src/index.css`, `frontend/src/hooks/useScienceApiStatus.ts`, `frontend/src/services/api.ts`, `frontend/src/lib/{text,pairProfile}.ts`, `frontend/src/data/dataset.ts`, `frontend/test/health.test.tsx`, `backend/tests/test_reliability.py`, and this report.

The pushed commit and production deployment outcome are recorded in the task's completion reply.
