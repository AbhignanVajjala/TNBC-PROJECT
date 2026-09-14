# EXO-RANK — Complete Technical Dossier (A → Z)

*Theory, statistical methods, the "ML question", validation, and development approach for the TNBC
targeted-exosome computational prioritization platform.*

> **Read this first (scientific integrity):** EXO-RANK derives its scores with **transparent
> statistics + literature-informed weighting — NOT machine learning.** There are **no experimentally
> labelled interactions** for the 200 pairs, so nothing can be *trained*. Section 7 explains what ML
> was considered, why it was rejected, and what a future calibration would require. The platform is a
> **prioritization** tool (which pairs to validate first), not a predictor of binding.

---

## A. Problem & scientific background (theory)

**TNBC.** Triple-negative breast cancer lacks ER, PR, and HER2 → many targeted therapies don't apply. It needs alternative surface-targeting strategies.

**Exosomes / extracellular vesicles (EVs).** 30–150 nm lipid-bilayer vesicles that carry proteins on their surface and in their lumen. They can act as delivery vehicles; a surface-exposed exosomal protein could recognize a cell-surface receptor on a TNBC cell.

**The computational problem.** For ~20 TNBC receptors and ~21 candidate exosomal proteins there are ~200 receptor–protein combinations. Testing all in the lab is infeasible → build a **decision-support funnel** that ranks pairs by converging computational evidence and outputs a short list for experimental validation.

**Terminology (strict):** "candidate", "predicted", "computationally prioritized", "evidence-supported", "candidate for experimental validation" — never "confirmed ligand" or "proven interaction".

---

## B. Overall approach / development philosophy

1. **A biologically-informed screening funnel** (not pure abundance ranking):
   TNBC receptors → accessible extracellular domains → plausible EV proteins → **Group A** (biologically selected) + **Group B** (background/contextual controls) → 200 pairs.
2. **Four independent evidence layers**, each answering a *different* question, combined only at the end:
   - **AFS** — AlphaFold structural/interface confidence
   - **PS** — PRODIGY predicted energetic favorability
   - **SS** — STRING prior biological/network evidence
   - **BS** — biological surface-presentation feasibility (a flag)
3. **Interpretability over sophistication:** every value is traceable to a source file; every formula is explicit; coefficients are provisional and sensitivity-tested; missing data is never fabricated.
4. **Integration key = Target No. + Protein** (never Target No. alone).
5. **Group A/B is a sanity check, never a training label.**

---

## C. Data sources & generation

| Layer | Source | What is extracted |
|---|---|---|
| Structure | AlphaFold2/ColabFold (154 pairs) + AlphaFold3 (46 pairs) | ipTM, pTM, PAE matrix, pLDDT array, chain boundaries; rank-1 PDB/CIF |
| Affinity | PRODIGY (run on AF2 structures) | ΔG, Kd, 6 contact-type counts, total contacts, NIS % |
| Evidence | STRING | combined score + 4 channels (co-expression, experimental, database, text-mining) |
| Feasibility | UniProt (REST), CSPA, SURFY, Vesiclepedia | subcellular localization, topology (TM, signal peptide, GPI) |

Coverage of the 200 pairs: **AFS 200/200, PS 151/200, SS 64/200, BS 200/200 (per candidate)**.
Structures: **200 PDBs** (AF2 `.pdb` + AF3 `.cif→.pdb`).

---

## D. Theory behind each metric

### D1. AlphaFold confidence metrics
- **pLDDT (0–100):** per-residue *local* confidence (predicted lDDT-Cα). High = well-folded locally; **not** an interface measure.
- **PAE (Å):** Predicted Aligned Error — expected position error of residue *i* when the structure is aligned on residue *j*. Low inter-chain PAE = confident *relative placement* of the two proteins.
- **pTM / ipTM:** predicted TM-score and *interface* predicted TM-score. TM-score ∈ (0,1] measures global fold/topology similarity; **ipTM** restricts it to inter-chain residue pairs → confidence in the **interface**. AlphaFold-Multimer's own model-ranking uses `0.8·ipTM + 0.2·pTM` (interface weighted 4× global).
- **interface PAE (our derived feature):** mean over interface residues of the *minimum* cross-chain PAE (coordinate-free; candidate = last chain; receptor-internal contacts excluded for heterodimeric receptors like αvβ3). More interface-specific and less redundant than whole-complex median PAE.

### D2. PRODIGY (contacts-based affinity) theory
- Central finding (Vangone & Bonvin 2015): the **number and type of interfacial contacts** (within 5.5 Å), plus non-interacting-surface (NIS) composition, predict binding affinity.
- PRODIGY's predictive model is a **linear regression**:
  `ΔG = Σ (coeff · IC_type) + coeff·%NIS_apolar + coeff·%NIS_charged + const`
  (ICs split by charged/polar/apolar). → **ΔG is a deterministic function of contacts + NIS.**
- **Thermodynamics:** `ΔG = R·T·ln(Kd)` → Kd = exp(ΔG/RT). Hence ΔG and log Kd are the *same* information.
- Consequence used in scoring: contacts, Kd, NIS are **redundant with ΔG** (see §E) → PS uses ΔG alone.

### D3. STRING combined-score theory
- STRING integrates evidence **channels** probabilistically. Each channel score is corrected for the **prior** probability that two random proteins are associated, combined as
  `S_combined = 1 − ∏_i (1 − S_i')` (then prior re-added).
- It is a **calibrated confidence** (benchmarked against KEGG pathways) that a *functional association* exists — **not** a physical binding constant. Scale 0.15–0.999.

### D4. Surfaceome / localization theory (for BS)
- A protein can only act as a *surface* ligand on an EV if it is membrane-anchored, GPI-linked, secreted/ECM, or otherwise externally exposed. Cytosolic/luminal proteins generally cannot reach a cell-surface receptor (though EV surface topology can be non-canonical — a documented caveat).
- Evidence: UniProt subcellular location + topology (TM domains, signal peptide, GPI), experimental surfaceome (CSPA), predicted surfaceome (SURFY), EV cargo (Vesiclepedia). **ExoCarta is deliberately excluded** (it seeded candidate selection → would be circular).

---

## E. Statistical methods used in data processing

All implemented in Python (pandas, numpy, scipy). No proprietary black boxes.

1. **Global min–max normalization** — rescale each feature to [0,1] across all 200 pairs:
   `X_N = (X − min)/(max − min)`; "lower-is-better" inverted `1 − …`. *Why global:* makes the ranking comparable across the whole dataset (not per-receptor).

2. **Winsorization (1st–99th percentile)** — outlier *capping* (not deletion) applied to PRODIGY ΔG before normalization, so one artifact (ΔG −69.1) doesn't dominate min–max. Values outside [P1,P99] are clipped to the cutoff.

3. **Skewness** — measured per feature to detect heavy tails (e.g. ipTM_N skew +1.98 → right-skewed, good discriminator; pLDDT_N skew −0.87 → compressed) to inform which features carry ranking signal.

4. **Pearson correlation (r)** — linear association; used to detect redundancy (e.g. mean PAE vs median PAE r≈0.91; ΔG vs contacts r=−0.985; STRING combined vs `1−∏(1−channels)` r=0.990).

5. **Spearman correlation (ρ)** — rank/monotonic association; used where relationships are non-linear or for *ranking* comparisons (source independence, weight-scheme agreement). Chosen because prioritization is fundamentally about ranks.

6. **Coefficient of determination R² (OLS)** — via least-squares (`numpy.linalg.lstsq`); used to prove ΔG is fully reconstructable from contacts+NIS (**R²=1.000**) and to quantify the "global-confidence" redundancy cluster in AFS features.

7. **Redundancy / collinearity detection** — flag feature pairs with |r| > 0.85 → drop or merge (removed mean PAE, PAE range; kept ΔG only; used STRING combined not channels).

8. **Mann–Whitney U test (non-parametric)** — Group A vs Group B comparisons on TPS, AFS, PS, SS, BS. Chosen over a t-test because the scores are skewed/bounded and not normal. *Used only as a sanity check, never to tune the model.*

9. **Cliff's delta (δ) / rank-biserial effect size** — magnitude/direction of A-vs-B differences (e.g. BS: δ=+0.98; integrated TPS: δ=+0.29). Reports *how much*, not just *whether*.

10. **Kruskal–Wallis H test** — tests whether TPS differs across the three BS categories (High/Med/Low); p=0.001.

11. **Sensitivity analysis (uncertainty analysis)** — the central robustness tool:
    - **Weight sweeps:** a 458-vector grid over AFS weights (and 5 named schemes); reasonable weight vectors for TPS.
    - **Agreement metrics:** Spearman rank-correlation between weighting schemes; **top-10 / top-20 overlap (Jaccard)**; per-pair rank range/min/max.
    - **Result:** rankings robust (AFS ρ 0.88–0.99; TPS ρ 0.88–0.99) → conclusions don't hinge on exact coefficients.

12. **Leave-one-source-out** — recompute TPS dropping each source; Spearman vs full TPS (AFS-only 0.40, PS-only 0.52, SS-only 0.79, 2-source 0.69–0.82) → no single source is a proxy; combining adds information.

13. **Composite-indicator methodology (OECD framework)** — the recipe followed: framework → variable choice → missing-data policy → normalization → weighting/aggregation → sensitivity/robustness.

14. **Rank aggregation (Robust Rank Aggregation, Kolde 2012)** — *considered* as an alternative integration; rejected for interpretability + heavy missingness. Documented as the alternative.

15. **Data-integrity statistics** — SHA-256 hashing (manifest verification), and **value-matching** (matching AlphaFold ipTM/pTM/median-PAE triples to the sheet) to fix mislabeled filenames.

---

## F. How each score is derived (formulas + coefficient logic)

**Normalization primitive:** global min–max (invert lower-is-better).

**F1. AFS (AlphaFold Score)**
```
AFS = 0.50·ipTM_N + 0.20·pTM_N + 0.15·interface_PAE_N + 0.15·mean_pLDDT_N
```
- Features chosen after redundancy pruning (dropped mean PAE r≈0.91, PAE range near-constant).
- Coefficients: literature hierarchy (ipTM≫pTM, AF-Multimer 0.8/0.2 precedent) + orthogonality of ipTM + compression of pLDDT; **sensitivity-tested** (robust).

**F2. PS (PRODIGY Score)**
```
PS = winsorized(ΔG)_N, inverted   (single feature — no coefficients)
```
- ΔG alone because contacts/Kd/NIS are mathematically redundant with it (r=−0.985, r=1.0, R²=1.0).

**F3. SS (STRING Score)**
```
SS = STRING combined score (used as-is, already calibrated 0–1)
```
- No normalization (would destroy calibration); channels already inside it (r=0.99). Optional evidence-quality reweighting `0.40·Exp+0.25·DB+0.20·PubMed+0.15·CoExp` (provisional, sensitivity-tested).

**F4. Coverage**
```
Coverage = (# available of {AFS,PS,SS}) / 3    ∈ {1/3, 2/3, 3/3}
```

**F5. TPS (final integrated score)**
```
TPS = mean of AVAILABLE {AFS, PS, SS}, equal ⅓ weights (available-source renormalization)
```
- Equal weights (no labels), robust under sensitivity + leave-one-out; missing = excluded, never 0/median.

**F6. BS (feasibility flag)** — ordinal High/Med/Low from a frozen UniProt-topology rule:
- HIGH: transmembrane + cell-membrane / GPI / (signal peptide + secreted) / explicit cell-surface.
- LOW: purely intracellular (no membrane/surface/secreted + no TM/signal/GPI).
- MEDIUM: peripheral/moonlighting/unconventional. **Not in TPS** (reproduces Group A/B, δ=+0.98 → circular); used as a **filter**.

**Ranking & shortlist:** rank by TPS ↓ (ties → coverage → AFS). **Preferred = Coverage ≥ 2/3 AND BS ≠ Low → 121 pairs.**

---

## G. The "ML" question — what we used and did NOT use

**No machine-learning model was trained to derive the scores.** This is deliberate and defensible:

- **Why not:** supervised ML needs labels (known binders/non-binders). We have **zero** experimentally-labelled interactions for these 200 TNBC pairs → any trained model would be fitting noise/selection bias. Group A/B is **not** a binding label (it's a selection framework), so it cannot be a training target.
- **What we used instead:** the individual scores each come from *externally-validated models built by others* (AlphaFold neural network for structure/confidence; PRODIGY's published linear regression for ΔG; STRING's benchmarked probabilistic integration). Our contribution is **transparent statistical processing + literature-informed weighting + sensitivity analysis**, not a new learned model.
- **Considered and rejected for the core score:**
  - *One-Class SVM / anomaly detection* (unsupervised) — rejected as the decision-maker because "an outlier is not automatically a good interaction"; could only ever be a secondary novelty layer.
  - *Supervised classifier on Group A/B* — rejected (circular; A/B isn't ground truth).
- **A future, legitimate ML/calibration path (designed, NOT executed — see `scoring/af_benchmark_research.md`):** calibrate AlphaFold-confidence weights against an **independent experimental benchmark** (e.g. Docking Benchmark 5.5) using **DockQ** (structural interface-quality, 0–1) as the target:
  - Model: **Ridge / ElasticNet regression** on standardized features (interpretable; handles collinearity).
  - Leakage control: **MMseqs2 30%-identity clustering → leave-cluster-out cross-validation.**
  - Baselines: ipTM-only, `0.8·ipTM+0.2·pTM`, pDockQ/pDockQ2.
  - Metrics: Spearman/Pearson/RMSE (regression), AUROC/AUPRC (acceptable-interface classification).
  - **Critical transfer rule:** fit the scaler on the benchmark, persist mean/std, and apply the *same* transform to TNBC — never re-fit on TNBC.
  - Status: **methodology prepared, not run** (no `.py` trained; scaffolds raise `NotImplementedError`).

So: **statistics + literature-weighting now; optional external-benchmark ML calibration later.** Nothing in the current scores is "learned from our data."

---

## H. Validation & robustness (what is legitimately possible without labels)

We explicitly separate **methodological robustness** (which we can show) from **biological validation** (which requires wet-lab).

1. **Weight sensitivity** — rankings stable across 458 AFS weight vectors and reasonable TPS weightings (Spearman 0.88–0.99, top-10 overlap 7–10/10). → conclusions not weight-dependent.
2. **Rank stability** — per-pair rank range across schemes; robust top set identified (Tier-1 pairs stable).
3. **Group A/B sanity check** — integrated TPS favors Group A (Mann–Whitney p<0.001, Cliff δ=+0.29); shortlist enrichment 90/100 (A) vs 31/100 (B). Reported honestly (AFS alone inverts this — the artifact).
4. **Positive/negative controls** — bona fide integrin ligands (FN1, THBS1, MFGE8) and surface proteins (integrins, CD44) score high on interface/BS; obligate cytosolic proteins score Low-BS.
5. **Modelability-artifact test** — cytosolic glycolytics (PGK1, LDHA, ALDOA, **TPI1 with the highest AFS 0.931**) are removed by BS-Low; moonlighting GAPDH/ENO1 retained at Medium → the framework *mitigates* the artifact (does not "solve" it).
6. **Leave-one-source-out** — confirms each source contributes; no single-source proxy.
7. **Redundancy / independence checks** — Pearson/Spearman/R² show sources are near-independent and within-source features aren't double-counted.
8. **Data-integrity verification** — SHA-256 manifest (`verify_data.py` → PASS on 215 files), value-matching that caught real errors (TKT mislabelled with DDR2's UniProt ID Q16832→P29401; an AF2 PDB label swap 16test1↔16test2).
9. **Literature cross-checks** — top "novel" pairs (ROR1~MFGE8, RON~THBS1, GPNMB~THBS1, IGF1R~ANXA2) confirmed to have *no reported direct interaction* → labelled "computationally prioritized candidates", not discoveries.

**Not claimed:** experimental validation, binding proof, or calibrated probabilities. Wet-lab (e.g. SPR on the recommended 10-pair panel) is the required next step.

---

## I. Software / system approach (brief)

- **Backend:** FastAPI + Pydantic, CSV/XLSX-backed (no DB needed for 200 rows), **fully portable** (bundles data + 200 PDBs + SHA-256 manifest; `verify_data.py`). Layered: routes → services → in-memory repository (joins on Target No.+Protein) → loaders → data. CORS via `FRONTEND_URL`.
- **Frontend:** React 19 + Vite + TypeScript + Tailwind + **3Dmol.js**. The Express server proxies `/api/exorank/*` → FastAPI (same-origin → no CORS). The 3D viewer loads the **real predicted PDB** per selected pair (chain A = receptor, B = candidate). PRODIGY contacts/NIS + scores + sequences shown with provenance.
- **Reproducibility:** every stage is a script in `scoring/`; intermediate CSVs at each step; raw data never overwritten.

---

## J. Results (summary)
- 200 → 176 (Coverage ≥ 2/3) → **121 preferred** (BS ≠ Low).
- Robustness tiers: Tier-1 = 5, Tier-2 = 16, Tier-3 = 100.
- Top pairs: αvβ3~{MFGE8, THBS1, ITGB1, ITGA6, FN1}, ROR1~MFGE8, CD44~FN1, EGFR~{FN1, ANXA2}.
- Recommended **10-pair experimental panel** (10 receptors, 6 candidates, evidence-supported + novel mix).

## K. Limitations
No experimental labels (prioritization, not prediction); weights provisional; AFS & PS share the same predicted structure; SS 68% missing and text-mining-dominated; BS UniProt-canonical + correlated with the selection axis; n=200; αvβ3 dominates; PRODIGY/AlphaFold on predicted (not experimental) structures.

## L. References (methods & data)
- Jumper et al. 2021, *Nature* — AlphaFold2 (pLDDT, PAE).
- Evans et al. 2022, *bioRxiv* — AlphaFold-Multimer (ipTM/pTM; 0.8/0.2 ranking).
- Abramson et al. 2024, *Nature* — AlphaFold3.
- Yin & Pierce 2022 (*Protein Sci*) / 2023 (*Bioinformatics*) — AF-Multimer benchmarking, ipTM–DockQ.
- Vangone & Bonvin 2015 (*eLife*) / Xue et al. 2016 (*Bioinformatics*) — PRODIGY.
- Basu & Wallner 2016 (*PLoS ONE*) — DockQ.
- Bryant et al. 2022 (*Nat Commun*) — pDockQ; Zhu et al. 2023 — pDockQ2; Dunbrack 2025 — ipSAE.
- Szklarczyk et al. — STRING combined score.
- Bausch-Fluck 2015 (*PLoS ONE*, CSPA) / 2018 (*PNAS*, SURFY); Pathan et al. 2019 (*NAR*, Vesiclepedia); UniProt.
- Vreven et al. 2015 / Guest et al. 2021 — Docking Benchmark 5.x.
- OECD/JRC 2008 — Handbook on Constructing Composite Indicators.
- Kolde et al. 2012 (*Bioinformatics*) — Robust Rank Aggregation.

---
*Companion docs: EXO_RANK_SYSTEM_OVERVIEW.md, EXO_RANK_DIAGRAMS.md, FINAL_EXO_RANK_RESULTS.md,
FINAL_TNBC_SCORING_METHODOLOGY.md, PRODIGY_Score_Justification.md, STRING_Score_Justification.md,
biological_feasibility_methodology.md, scoring/af_benchmark_research.md, backend/README.md.*
