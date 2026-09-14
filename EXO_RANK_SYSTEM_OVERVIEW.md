# EXO-RANK — Complete System Overview (Presentation Master File)

> **Purpose of this file:** a single source of truth for building a slide deck. It contains
> (A) the full narrative + architecture, (B) a slide-by-slide deck outline with speaker notes,
> and (C) a ready-to-paste prompt for an AI PPT generator (Gamma / Claude / Copilot).
>
> **One-line pitch:** *EXO-RANK is a multi-evidence computational platform that ranks ~200 TNBC
> receptor–exosomal-protein pairs to decide which interactions to validate experimentally first.*
> It is a **prioritization** tool — not proof of binding.

---

# PART A — FULL SYSTEM OVERVIEW

## A1. The problem
- Triple-negative breast cancer (TNBC) lacks ER/PR/HER2 → few targeted options.
- Idea: use **exosomes / extracellular vesicles (EVs)** as delivery vehicles and find **exosomal proteins** that can recognize **TNBC cell-surface receptors**.
- Experimentally testing every receptor × protein combination is infeasible → we need a **computational funnel** that shortlists the most promising pairs for the lab.

## A2. The screening funnel (what the 200 pairs represent)
```
TNBC-relevant receptors  →  extracellularly accessible domains  →  biologically plausible EV proteins
   →  Group A (selected) vs Group B (background controls)  →  structure prediction  →  affinity estimation
   →  external evidence  →  integrated prioritization  →  experimental-validation shortlist
```
- **20 TNBC receptors × ~10 candidate proteins = 200 receptor–protein pairs** (1 pair = 1 row).
- **21 unique candidate exosomal proteins.**
- **Group A (groups 1–5)** = biologically-selected candidates (ECM/adhesion: ANXA2, LGALS3BP, SDCBP, FN1, MFGE8, THBS1, integrins, CD44 …).
- **Group B (groups 6–10)** = background/contextual controls (glycolytic/moonlighting: GAPDH, PGK1, ENO1, LDHA, ALDOA, PKM, TPI1 …) — used to test whether Group A signals are *enriched*, not as negatives.
- **Integration key = Target No. + Protein** (never Target No. alone).

## A3. The four evidence layers
| Layer | Source | Question it answers | Output |
|---|---|---|---|
| **AFS** | AlphaFold2/ColabFold + AlphaFold3 | Is the predicted complex structurally confident (esp. the interface)? | 0–1 |
| **PS** | PRODIGY | Is the modelled interface energetically favorable? | 0–1 |
| **SS** | STRING | Is there prior biological/network association evidence? | 0–1 |
| **BS** | UniProt / CSPA / SURFY / Vesiclepedia | Can the ligand physically be on the EV *surface* to reach the receptor? | High/Med/Low flag |

Core premise (verified): AFS, PS, SS are **near-independent** (pairwise Spearman |r| ≤ 0.13) → combining them adds information.

## A4. Scoring — formulas & how coefficients were chosen
**Guiding constraint:** no experimentally-labelled interactions exist → coefficients are **not learned**. They are literature-informed, redundancy-pruned, and sensitivity-tested (never "validated").

**Normalization primitive** (global min–max across all 200 pairs):
`X_N = (X−min)/(max−min)`; for "lower-is-better", invert: `1 − …`.

**AFS (AlphaFold):**
```
AFS = 0.50·ipTM_N + 0.20·pTM_N + 0.15·interface_PAE_N + 0.15·mean_pLDDT_N
```
- ipTM dominant (interface metric; AF-Multimer precedent 0.8·ipTM+0.2·pTM; best DockQ predictor).
- Dropped: mean PAE (r≈0.91 w/ median PAE), PAE range (near-constant). interface PAE replaced whole-complex median PAE (less redundant).
- Weights robust under a 458-vector sensitivity sweep (Spearman 0.88–0.99).

**PS (PRODIGY):**
```
PS = winsorized(1–99%) ΔG, min–max normalized, inverted (more-negative ΔG → higher)
```
- Single feature: ΔG already = f(contacts + NIS) (R²=1.0); Kd = exp(ΔG/RT) (r=1.0) → contacts/Kd/NIS would double-count. Kept as descriptors only.
- Winsorizing tames one artifact (ΔG −69.1) without deleting it.

**SS (STRING):**
```
SS = STRING combined score, used directly (already calibrated 0–1)
```
- Combined score = STRING's own probabilistic channel integration `1 − ∏(1−Sᵢ')`; re-adding channels double-counts (r=0.99). Optional project variant: `0.40·Exp + 0.25·DB + 0.20·PubMed + 0.15·CoExp` (evidence-quality hierarchy, provisional, sensitivity-tested).
- Caveat: 62/64 scored pairs are text-mining-dominated → "literature association", not experimental proof.

**Coverage:** `Coverage = (#available of {AFS,PS,SS}) / 3` ∈ {1/3, 2/3, 3/3} (reported, not scored).

**TPS (final integrated score):**
```
TPS = mean of AVAILABLE {AFS, PS, SS}, equal weights (⅓ each), renormalized
```
- Equal weights (no labels justify otherwise); robust under sensitivity + leave-one-source-out.
- **Missing = excluded from the mean, never 0 or median.**

**BS (feasibility flag):** ordinal High/Med/Low from UniProt localization/topology (+CSPA/SURFY/Vesiclepedia). **Not part of TPS** (it reproduces the Group-A/B split, Cliff d=+0.98 → would be circular). Used as a *filter*.

**Ranking & shortlist:** rank by TPS ↓ (ties → coverage, then AFS). **Preferred shortlist = Coverage ≥ 2/3 AND BS ≠ Low → 121 of 200 pairs.**

## A5. Data pipeline (how raw predictions become scores)
```
AF2 JSONs (extracted_jsons) + AF3 full_data/summary  ─┐
PRODIGY text (final prodigv1.txt)                     ─┤ parse → normalize → score
STRING evidence (STRING INFO.xlsx)                    ─┤   (scoring/*.py)
UniProt localization (REST API)                       ─┘
        → outputs/*.csv (AFS, PS, SS, BS, TPS, coverage, rank)
        → full_pdbs/*.pdb (200 predicted complexes; AF2 .pdb + AF3 .cif→.pdb)
```
Missingness: **AFS 200/200, PS 151/200 (AF3 pairs lack PRODIGY), SS 64/200 (rest = no STRING record).**

## A6. Key results
- **200 → 176 (coverage ≥ 2/3) → 121 preferred (BS ≠ Low).**
- **Robustness tiers:** Tier-1 (3-source, High-BS, stable) = 5 pairs; Tier-2 = 16; Tier-3 = 100.
- **Top pairs (by TPS):** αvβ3~MFGE8 (#1), αvβ3~THBS1, αvβ3~ITGB1, αvβ3~ITGA6, ROR1~MFGE8, αvβ3~FN1, CD44~FN1, EGFR~FN1, EGFR~GAPDH, ICAM1~ITGB1.
- **Tier-1 robust:** CD44~THBS1, EpCAM~CD44, CD44~LGALS3BP, CD44~ITGB1, CXCR4~ITGB1.
- **Potentially novel (no reported interaction, lit-checked):** ROR1~MFGE8, RON~THBS1, GPNMB~THBS1, IGF1R~ANXA2 → "computationally prioritized candidates," *not* "discovered interactions."
- **Modelability artifact mitigated:** cytosolic glycolytic candidates (PGK1, LDHA, ALDOA, TPI1 — even TPI1 with the highest AFS 0.931) are removed by BS=Low; the two with real surface-moonlighting (GAPDH, ENO1) survive at Medium.
- **Group A/B sanity (not a training label):** integrated TPS favors A (median 0.358 vs 0.304, Cliff d=+0.29); shortlist enrichment A 90/100 vs B 31/100.
- **Data-integrity catches:** TKT was mislabelled with DDR2's UniProt ID (Q16832→corrected P29401); one AF2 PDB outer-label swap (16test1↔16test2) resolved by value-matching.

## A7. Software architecture (the running system)
```
┌────────────── Frontend (React 19 + Vite + TS, :3000) ──────────────┐
│  Target selector → Analysis view                                     │
│  3D viewer (3Dmol.js) · scores panels · PRODIGY contacts · sequences │
│  calls same-origin /api/*                                            │
└───────────────┬─────────────────────────────────────────────────────┘
                │  Express server (server.ts) — SPA + /api proxy
                │  /api/exorank/*  ──proxy──▶
┌───────────────▼──────────── Backend (FastAPI, :8000) ───────────────┐
│  /api/interactions, /scores, /evidence, /structure, /structure/pdb   │
│  /receptors /candidates /shortlist /health /system/status            │
│  in-memory repository (joins all sources on Target No. + Protein)    │
└───────────────┬──────────────────────────────────────────────────────┘
                │  reads (portable, self-contained)
        backend/data/raw/*.csv|xlsx  ·  data/structures/*.pdb  ·  MANIFEST.json
```
- **Backend:** FastAPI + Pydantic, CSV/XLSX-backed (no DB needed for 200 rows), **fully portable** (`backend/` bundles data + 200 PDBs + hash-verified manifest; `scripts/verify_data.py` → PASS). CORS via `FRONTEND_URL`.
- **Frontend↔Backend:** the frontend's Express server proxies `/api/exorank/*` → FastAPI (same-origin → no CORS issues). Interaction id = `T{receptorNo}_{PROTEIN}` (e.g. `T1_ANXA2`).
- **3D viewer:** 3Dmol.js loads the **real predicted PDB** for the selected pair from `/api/exorank/structure/{id}` (chain A = receptor, chain B = candidate); stretches to fill the panel; graceful placeholder if backend offline.
- **Provenance:** every scientific field carries its source file; missing values are `null`, never fabricated.

## A8. Limitations (state openly)
- No experimental labels → prioritization, not prediction; weights provisional, not validated.
- AFS & PS share the same predicted AlphaFold structure (not fully independent).
- SS is 68% missing and text-mining-dominated (not experimental).
- BS is UniProt-canonical (conservative for non-canonical EV-surface topology) and correlated with the selection axis.
- n=200; αvβ3 dominates the top. PRODIGY/AlphaFold run on predicted (not experimental) structures.

## A9. Honest claims / do-not-say
- ✅ "predicted", "computationally prioritized", "evidence-supported", "candidate for experimental validation".
- ❌ "AlphaFold proves binding", "PRODIGY measures experimental affinity", "STRING confirms interaction", "TPS predicts targeting success".

## A10. Tech stack & tooling
- **Science/scoring:** Python, pandas, numpy, scipy (scripts in `scoring/`), AlphaFold2/ColabFold, AlphaFold3, PRODIGY, STRING, UniProt/CSPA/SURFY/Vesiclepedia.
- **Backend:** FastAPI, Pydantic, Uvicorn, openpyxl.
- **Frontend:** React 19, Vite, TypeScript, Tailwind, 3Dmol.js, Express, (Gemini for optional AI insights).
- **Key references:** Jumper 2021 (AlphaFold2); Evans 2022 (AlphaFold-Multimer); Abramson 2024 (AlphaFold3); Yin & Pierce 2022/2023 (benchmarking); Vangone & Bonvin 2015 / Xue 2016 (PRODIGY); Szklarczyk (STRING); Basu & Wallner 2016 (DockQ); Bausch-Fluck 2015/2018 (CSPA/SURFY); Pathan 2019 (Vesiclepedia); OECD 2008 (composite indicators); Kolde 2012 (rank aggregation).

---

# PART B — SLIDE-BY-SLIDE DECK OUTLINE (~16 slides)

**Slide 1 — Title**
EXO-RANK: A Multi-Evidence Computational Platform for Prioritizing TNBC Targeted-Exosome Interactions.
Subtitle: "Which receptor–exosomal-protein pairs should we validate first?"
*Notes: emphasize prioritization, not proof.*

**Slide 2 — The Problem**
TNBC lacks ER/PR/HER2 → limited targeting. Exosomes as delivery vehicles. Too many receptor×protein combos to test blindly.
*Notes: motivate the funnel.*

**Slide 3 — The Screening Funnel**
Diagram (A2). 20 receptors × 10 candidates = 200 pairs. Group A vs Group B.
*Notes: Group B are contextual controls, not negatives.*

**Slide 4 — Four Independent Evidence Layers**
Table (A3): AFS / PS / SS / BS + what each answers. Show they are near-independent.
*Notes: this independence is why combining works.*

**Slide 5 — AlphaFold Score (AFS)**
Formula + the 4 features + dropped features + why ipTM dominates. Sensitivity-tested.
*Notes: mention AF2 + AF3.*

**Slide 6 — PRODIGY Score (PS)**
Formula (winsorized ΔG). Why single feature (ΔG = f(contacts+NIS), Kd=exp(ΔG/RT)).
*Notes: contacts/NIS shown as descriptors in the UI.*

**Slide 7 — STRING Score (SS)**
Combined score used as-is; channels already inside it; text-mining caveat.
*Notes: optional evidence-quality reweighting.*

**Slide 8 — Coverage & Missing Data**
Coverage = n/3. Never impute 0/median. Missingness: AFS 200 / PS 151 / SS 64.
*Notes: absence of evidence ≠ evidence of absence.*

**Slide 9 — Final Integrated Score (TPS)**
Formula (mean of available, equal weights). Why equal. Sensitivity + leave-one-out.
*Notes: worked mini-example.*

**Slide 10 — Biological Feasibility (BS)**
High/Med/Low flag; why it's a filter not a score (circularity, Cliff d=+0.98); fixes the artifact.

**Slide 11 — Results: The Shortlist**
200 → 176 → 121. Robustness tiers. Top-10 table.

**Slide 12 — Modelability Artifact — Solved-enough**
Cytosolic glycolytics (incl. TPI1 AFS 0.931) filtered by BS; GAPDH/ENO1 retained at Medium.

**Slide 13 — Known vs Novel + Group A/B Sanity**
Evidence-supported vs potentially-novel pairs. A>B enrichment (90 vs 31).

**Slide 14 — Recommended Experimental Panel**
10 diverse pairs (10 receptors, 6 candidates, mix of evidence-supported + novel).

**Slide 15 — System Architecture**
Diagram (A7): React+3Dmol → Express proxy → FastAPI → portable data/PDBs. Live 3D viewer per pair.

**Slide 16 — Limitations, Claims & Next Steps**
A8 + A9. Next: collect more STRING/experimental evidence; wet-lab the panel.

*(Optional appendix slides: full formula sheet, data-integrity catches, references.)*

---

# PART C — READY-TO-PASTE AI-PPT PROMPT

Paste the following into an AI slide generator (Gamma, Claude, Copilot, Beautiful.ai). It is self-contained.

```
Create a clean, professional 16-slide scientific presentation titled
"EXO-RANK: Multi-Evidence Computational Prioritization of TNBC Targeted-Exosome Interactions".
Audience: an ideathon / research review panel. Tone: rigorous, honest, no overclaiming.
Design: minimal, science-poster aesthetic, sage/forest-green + terracotta accents, one idea per slide,
diagrams over text, monospace for formulas.

Key framing: EXO-RANK ranks ~200 TNBC receptor–exosomal-protein pairs to decide which to validate
experimentally FIRST. It is a prioritization platform, NOT proof of binding. Never say AlphaFold proves
binding, PRODIGY measures experimental affinity, or STRING confirms interaction.

Slides:
1. Title + one-line pitch.
2. Problem: TNBC lacks ER/PR/HER2; exosomes as delivery vehicles; too many combos to test blindly.
3. Screening funnel: 20 receptors × 10 candidates = 200 pairs; Group A (selected) vs Group B (background controls).
4. Four near-independent evidence layers: AFS (AlphaFold structure), PS (PRODIGY energetics), SS (STRING prior evidence), BS (surface-feasibility flag). Pairwise correlation |r| ≤ 0.13.
5. AFS = 0.50·ipTM_N + 0.20·pTM_N + 0.15·interface_PAE_N + 0.15·mean_pLDDT_N; global min-max normalized; ipTM dominant (AF-Multimer precedent); dropped mean-PAE & PAE-range; weights sensitivity-tested (ρ 0.88–0.99).
6. PS = winsorized ΔG, normalized & inverted; single feature because ΔG = f(contacts+NIS) (R²=1.0) and Kd=exp(ΔG/RT) (r=1.0) — combining would double-count.
7. SS = STRING combined score used directly (already 0–1 calibrated); channels already integrated inside it (r=0.99); caveat: 62/64 pairs are text-mining-dominated = literature association, not experimental.
8. Coverage = #available/3; missing data is never imputed as 0 or median; coverage: AFS 200, PS 151, SS 64 of 200.
9. TPS = mean of available {AFS, PS, SS}, equal ⅓ weights (no labels to justify otherwise), robust under sensitivity + leave-one-source-out.
10. BS = High/Med/Low feasibility flag (can the ligand reach the EV surface?); kept OUT of TPS because it reproduces the Group-A/B split (Cliff d=+0.98) → would be circular; used as a filter; it fixes the artifact where cytosolic proteins get high structural scores.
11. Results: 200 → 176 (coverage ≥ 2/3) → 121 preferred (BS ≠ Low). Robustness tiers: Tier-1=5, Tier-2=16. Top pairs: αvβ3~MFGE8/THBS1/ITGB1/ITGA6/FN1, ROR1~MFGE8, CD44~FN1, EGFR~FN1/ANXA2.
12. Modelability artifact mitigated: cytosolic glycolytic candidates (PGK1, LDHA, ALDOA, TPI1 — TPI1 had the highest AFS 0.931) removed by BS=Low; GAPDH/ENO1 (documented surface-moonlighting) kept at Medium.
13. Known vs novel + Group A/B sanity: evidence-supported (αvβ3~FN1/THBS1, EGFR~ANXA2) vs potentially-novel (ROR1~MFGE8, RON~THBS1, GPNMB~THBS1, IGF1R~ANXA2, phrase as "computationally prioritized candidates"); TPS favors Group A (Cliff d=+0.29; shortlist enrichment 90 vs 31).
14. Recommended 10-pair experimental panel spanning 10 receptors and 6 candidates (mix of evidence-supported + novel).
15. System architecture: React 19 + Vite + 3Dmol.js frontend → Express same-origin proxy → portable FastAPI backend (CSV/XLSX + 200 bundled PDBs + hash-verified manifest); interaction id = T{receptorNo}_{PROTEIN}; the 3D viewer loads the real predicted complex PDB per selected pair (chain A = receptor, chain B = candidate).
16. Limitations & honest claims: no experimental labels (prioritization not prediction); weights provisional; AFS/PS share the same structure; SS sparse/text-mining; next steps = collect STRING/experimental evidence and wet-lab the panel.

For each slide provide: a short title, 3–5 concise bullets, and one speaker note. Render formulas in monospace.
```

---

*Generated as the presentation master for EXO-RANK. Pair this with the deeper docs in the repo:
FINAL_EXO_RANK_RESULTS.md, FINAL_TNBC_SCORING_METHODOLOGY.md, PRODIGY_Score_Justification.md,
STRING_Score_Justification.md, biological_feasibility_methodology.md, and backend/README.md.*
