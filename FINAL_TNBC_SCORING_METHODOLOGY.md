# FINAL TNBC Scoring Methodology — EXO-RANK

*Integrating AlphaFold (AFS), PRODIGY (PS), and STRING (SS) into one Targeting Priority Score (TPS) for ~200 receptor–candidate pairs. No experimental labels; no ML. Legend: [LIT] published, [DATA] our finding, [CHOICE] our decision.*

## 1. Executive conclusion
Combine the three layers with a **coverage-aware weighted mean over available sources** (equal weights, renormalized per pair), report an **evidence-coverage tier** alongside, and treat the Biological Score **BS as a surface-presentation feasibility FLAG — not a fourth additive term.** Empirically, the three scores **represent distinct evidence dimensions, with low empirical correlation between the STRING layer and the AlphaFold/PRODIGY layers (|Spearman| ≤ 0.13)** — noting that **AFS and PS share the AlphaFold-derived structural model and are therefore not fully independent measurements in a strict statistical sense.** This distinctness justifies a composite; but **BS (a literature-informed prototype) reproduces the Group A/B selection split almost perfectly (Cliff's d = +0.98)**, so adding it as a score would re-inject the candidate-selection logic (circular). As a flag, BS still delivers its one real value: it catches high-AFS pairs whose ligand is cytosolic and cannot plausibly be surface-presented. **BS flag values are PENDING** — not yet computed from real sources; not invented here.

## 2. Project scoring architecture
- Inputs (0–1): **AFS** (structure/interface confidence, 200/200), **PS** (winsorized ΔG, 151/200), **SS** (STRING combined, 64/200).
- **TPS = mean of available {AFS,PS,SS}** (equal weights, renormalized), + **coverage ∈ {1,2,3}**.
- **BS** = ligand surface-presentation feasibility, reported as High/Medium/Low **flag**.
- Validation shortlist = **coverage ≥ 2 AND BS ≠ Low**, ranked by TPS.

## 3. Literature review
- **Composite indicators (authoritative method):** OECD/JRC *Handbook on Constructing Composite Indicators* — framework → variables → missing data → normalization → weighting/aggregation → **uncertainty & sensitivity analysis**; warns that extreme values/skew distort normalization; notes correlated indicators can reflect **non-compensable** aspects (don't over-correct) [OECD 2008].
- **Rank aggregation:** Robust Rank Aggregation is parameter-free and robust to noise, standard for integrating heterogeneous biological lists [Kolde et al. 2012, *Bioinformatics*] — considered, but rejected here (interpretability + 136 missing SS make its null model awkward).
- **Confidence integration for PPIs:** AlphaFold-Multimer ipTM/pTM ranking [Evans et al. 2022]; ipTM best interface-quality predictor [Yin & Pierce 2023]; PRODIGY ΔG is a linear function of contacts+NIS [Vangone & Bonvin 2015; Xue 2016]; STRING combined = calibrated probability integrating channels [Szklarczyk et al., STRING].
- **Surfaceome / EV localization:** CSPA experimental surfaceome [Bausch-Fluck 2015, *PLoS ONE*]; SURFY predictor [Bausch-Fluck 2018, *PNAS*]; Vesiclepedia [Pathan 2019/2024, *NAR*]; EV surface topology is non-trivial — cytosolic proteins can appear on the EV surface [*Sci Rep* 2016]; UniProt for curated localization/topology.
- **Principle:** absence of evidence ≠ evidence of absence (missing-data handling).

## 4. AlphaFold evidence
AFS = 0.50 ipTM_N + 0.20 pTM_N + 0.15 interface_PAE_N + 0.15 mean_pLDDT_N (finalized, sensitivity-tested). ipTM = interface axis; provisional structural-confidence score, **not** proof of binding. Known artifact: pTM/pLDDT reward well-folded, training-abundant proteins (e.g. glycolytic controls) → AFS can over-rank cytosolic candidates.

## 5. PRODIGY evidence
PS = winsorized(1–99%) min–max of ΔG, inverted. Contacts excluded (ΔG≈−0.985 with contacts; reconstructed R²≈1.0 — double-counting). Predicted energetic favorability on the AF-modeled complex, **not** experimental affinity. 49 missing (AF3 pairs + errors).

## 6. STRING evidence
[CHOICE] For the composite, **SS = STRING combined score, used directly (already calibrated 0–1)**. Rationale: parsimony — the project-specific channel reweighting barely changes ranking (ρ ≥ 0.97) and introduces extra provisional weights. Provenance caveat: 62/64 scored pairs are text-mining-dominated → SS = **prior literature/association evidence**, not experimental confirmation. 136 missing.

## 7. Biological Score evaluation
BS answers a question the others cannot: *can the ligand be presented on the outer EV surface to reach the receptor?* Sources (independent of ExoCarta): UniProt localization/topology, CSPA, SURFY, Vesiclepedia. **[DATA] Critical test:** a literature-tier BS prototype over the 21 candidates separates Group A vs B with **Cliff's d = +0.98 (p=5×10⁻³⁵)** — i.e. BS ≈ the extracellular-vs-cytosolic criterion that *defined* Group A/B. → As an additive score, **BS is essentially circular.** But BS ⟂ AFS (Spearman −0.14) and disagrees with A/B for a few pairs (ENO1/GAPDH surface-moonlighters in B; ANXA2/SDCBP/HSP90AA1 modest in A) → its genuine, non-circular value is **flagging biologically implausible high-AFS pairs**, not rescoring the whole list. **[CHOICE] BS = feasibility flag, not a 4th additive term.**

## 8. Source independence / redundancy [DATA]
Spearman (`outputs/source_correlation.csv`):
| | AFS | PS | SS | BS |
|---|---|---|---|---|
| AFS | 1 | −0.13 | 0.02 | −0.14 |
| PS | | 1 | 0.08 | 0.16 |
| SS | | | 1 | 0.35 |
| BS | | | | 1 |

**[Terminology — important]** We do NOT call these "statistically independent sources." Correctly: *the three scores represent distinct evidence dimensions, with low empirical correlation between the STRING layer and the AlphaFold/PRODIGY layers.* **AFS and PS share the AlphaFold-derived structural model and are therefore not fully independent measurements in a strict statistical sense** (they correlate −0.13 and measure different properties — confidence vs energetics — of the same predicted structure). This distinctness justifies a composite (adds information, not redundant). BS's largest correlation is with SS (0.35), a further reason to keep BS out of the additive score.

## 9. Missing-data analysis [DATA+CHOICE]
Coverage: **24 pairs 1-source, 137 2-source, 39 3-source.** Compared options: (1) missing=0 → treats absence as evidence-of-absence (rejected); (2) median → invents evidence (rejected); (3) **available-weight renormalization** (chosen) — weighted mean over present sources only; (4) Bayesian (overkill, no priors); (5) coverage penalty (partially punishes absence — rejected as sole method); (6) **separate score + coverage metric** (chosen, paired with 3); (7) two-stage ranking (adopted via the shortlist rule). **Decision:** available-weight renormalization **plus a coverage tier**, and require **coverage ≥ 2** for the prioritized shortlist. This honors "absence ≠ negative" (a 1-source pair still gets a TPS) while preventing a single-source pair from ranking as if multi-source-supported — directly fixing the observed contamination where cytosolic AFS-only pairs (PGK1/LDHA/ALDOA@αvβ3, coverage=1) crash the top ranks.

## 10. Normalization [CHOICE]
No new scaling. AFS features already min–max 0–1; PS winsorized 0–1 (winsor chosen because a ΔG −69 artifact crushes plain min–max); SS already a calibrated 0–1 probability (min–max would destroy its calibration, per OECD extreme-value caution). All three live on a comparable 0–1 scale, so the weighted mean is well-posed.

## 11. Weight-selection analysis [DATA]
No labels → no data-fitted weights. **Equal weights (⅓ each) primary** (OECD default; least arbitrary), sensitivity-tested. Sensitivity (`outputs/scoring_sensitivity.csv`): equal vs afs-lean ρ=0.945, vs afs-heavy ρ=0.879, vs struct-lean ρ=0.975, vs SS-up ρ=0.968. Rankings are **moderately robust** (ρ 0.88–0.98). Because the sources are genuinely independent, reweighting *does* move mid-ranks (unlike within-AFS) — expected and honest. Ordering rationale if unequal is preferred: AFS ≥ PS ≥ SS (AFS most interaction-specific; PS a secondary readout of the same structure; SS orthogonal but sparse/text-mining). We report equal as primary and AFS-lean as the sensitivity alternative.

## 12. Candidate ranking methodology
1. Compute AFS, PS, SS (0–1). 2. TPS = mean of available sources (equal weights). 3. coverage = #present. 4. BS flag per ligand. 5. **Rank by TPS; the prioritized validation shortlist = coverage ≥ 2 AND BS ≠ Low.** Same-TPS ties broken by higher coverage, then higher AFS.

## 13. Sensitivity analysis [DATA]
Weight sensitivity (above): robust top-set stable. **Robust top-20 (all weightings)** is dominated by αvβ3 (target 6): Group-A high-BS pairs (MFGE8, THBS1, ITGB1, ITGA6, FN1, coverage 2) — the defensible candidates — **and** cytosolic Group-B AFS-only pairs (PGK1, ENO1, LDHA, ALDOA, coverage 1, BS Low) — which the **coverage≥2 + BS-flag rules correctly demote.** This is a concrete demonstration that the architecture removes the AFS modelability artifact.

## 14. Final recommended formula
For each pair, with present sources S ⊆ {AFS, PS, SS} and equal weights w=⅓:
```
TPS      = ( Σ_{i∈S} w·score_i ) / ( Σ_{i∈S} w )      # = mean of available 0–1 scores
coverage = |S|                                         # 1, 2, or 3
BS_flag  = High (≥0.7) | Medium (0.3–0.7) | Low (<0.3) # per ligand, surface feasibility
```
Prioritized shortlist: **coverage ≥ 2 AND BS_flag ≠ Low**, sorted by TPS (desc); ties → coverage, then AFS. BS is **not** in the number.

## 15. Validation / robustness (methodological, NOT biological)
Legitimate without labels: weight sensitivity (done), rank stability (done), coverage analysis (done), Group A/B sanity (BS d=+0.98; TPS A vs B trend), known positive controls (integrins/MFGE8/tetraspanins high-BS), negative/context controls (glycolytic low-BS), leave-one-source-out (recompute TPS dropping each source), missing-data sensitivity (compare renormalization vs coverage-penalty), source redundancy (done). These establish **methodological robustness only** — never biological validation.

## 16. Limitations
- **Biggest:** no experimental interaction labels — the entire score is *prioritization*, not prediction; weights are provisional, not validated.
- AFS and PS both derive from the same AF-predicted structure (partial shared origin).
- SS is 68% missing and text-mining-dominated.
- BS from localization is noisy (EV surface topology is non-canonical) and partly circular.
- PRODIGY/AFS run on predicted (not experimental) structures.
- Small n (200); one receptor (αvβ3) dominates the robust top-set.

## 17. Judge-proof explanation
**Combine:** "Each pair gets three independent 0–1 scores — AlphaFold structural confidence, PRODIGY predicted interface energetics, STRING prior biological-association evidence. We verified they're near-independent (correlations ≤ 0.13), then take the mean of whichever scores are available and report how many sources support each pair. Equal weights, because we have no experimental labels to justify unequal ones, and we show the ranking is robust to reasonable reweighting." **BS:** "We tested a biological surface-feasibility score but found it almost perfectly reproduces our own candidate-selection split — so using it as a fourth score would be circular. We keep it as a feasibility *flag* to catch structurally-confident but physically-implausible pairs, not as part of the number." **High score means:** "Multiple independent computational lines of evidence converge on this pair as worth validating *first* — not that it binds." **Missing/double-counting:** "We never impute zeros (absence ≠ negative); we average only available sources and flag coverage so single-source pairs can't masquerade as fully-supported. We dropped redundant features (PRODIGY contacts, STRING channels) that just re-encode ΔG/combined."

## 18. Exact implementation specification
- Join: AFS+PS on (Target No., Group, Protein); SS on (Target No., Protein). SS = STRING_combined.
- Scores already 0–1; no rescaling.
- `TPS_equal` = row-mean of available {AFS,PS,SS}; `coverage` = count present.
- `BS` per ligand from UniProt loc/topology + CSPA + SURFY + Vesiclepedia (build step; prototype tiers used for this analysis).
- Output columns: Target No., Group, Group_AB, Protein, AFS, PS, SS, coverage, BS, BS_flag, TPS_equal, rank.
- Shortlist filter: coverage ≥ 2 & BS_flag ≠ Low.
- Files: `outputs/final_score_example.csv`, `outputs/scoring_sensitivity.csv`, `outputs/source_correlation.csv`.
- No ML (no labels → not justifiable). No genomics tools (answer no necessary question here).

---

# FINAL DECISION

1. **Combine AFS + PS + SS into one score? — YES.** They are near-independent (|Spearman| ≤ 0.13); combining adds real information.
2. **Exact formula:** `TPS = mean of available {AFS, PS, SS}` (equal weights, renormalized per pair) + reported `coverage`.
3. **Exact weights:** **equal, ⅓ each** (no labels justify otherwise); sensitivity-tested (ρ 0.88–0.98). AFS-lean 0.50/0.30/0.20 as the reported alternative.
4. **Missing PS/SS:** **available-weight renormalization + coverage tier; never impute 0 or median.** Shortlist requires coverage ≥ 2.
5. **Should BS exist? — YES, but not as a score.**
6. **BS role:** **a feasibility FLAG/filter** (High/Medium/Low), applied to the shortlist — **not additive, not a silent multiplier.** (It is empirically circular with Group A/B, Cliff d=+0.98, so it must not enter the number.)
7. **BS formula:** per-ligand tier = `High ≥0.7 / Medium 0.3–0.7 / Low <0.3`, from a reliability-ranked evidence cascade (direct EV-surface > CSPA experimental > UniProt topology > SURFY prediction > cytosolic-moonlighting). Not the probabilistic `1−∏(1−rᵢeᵢ)` — the reliability values aren't calibrated probabilities, so an ordinal tier is more honest.
8. **BS evidence sources:** UniProt localization/topology, CSPA, SURFY, Vesiclepedia, EV-surface proteomics. **Never ExoCarta** (used in selection); **no** TNBC-relevance or generic EV-presence (both circular).
9. **Final ranking output:** per pair — AFS, PS, SS, coverage, BS_flag, TPS, rank; prioritized shortlist = coverage ≥ 2 & BS ≠ Low, sorted by TPS.
10. **Single biggest limitation:** **no experimental interaction labels** — TPS ranks candidates for validation; it does not predict binding, and its weights are provisional not validated.

---

# FINAL LOCKED METHODOLOGY

*Compact specification for EXO-RANK project documentation. Implemented in `scoring/final_tps.py` → `outputs/final_score_calculation.csv`. Raw AlphaFold/PRODIGY/STRING files unmodified.*

**Architecture**
```
AlphaFold → AFS ┐
PRODIGY  → PS  ┼→ TPS → Coverage → BS feasibility flag → shortlist
STRING   → SS  ┘
```

**Scores (all native 0–1, no rescaling)**
- AFS = 0.50 ipTM_N + 0.20 pTM_N + 0.15 interface_PAE_N + 0.15 mean_pLDDT_N
- PS  = winsorized(1–99%) ΔG_norm (inverted)
- SS  = STRING Combined Score, used directly (channels retained for provenance only)

**TPS (equal weights, available-score renormalization)**
```
S = available sources ⊆ {AFS, PS, SS}
TPS = ( Σ_{i∈S} (1/3)·score_i ) / ( Σ_{i∈S} 1/3 ) = mean of available 0–1 scores
```
3/3 → (AFS+PS+SS)/3 ; 2/3 → mean of the two present ; 1/3 → AFS alone.

**Missing-data policy:** never impute 0 or median; excluded source simply drops out of that pair's mean.

**Coverage:** `Coverage = n_available / 3` ∈ {1/3, 2/3, 3/3}. Reported separately; NOT weighted into TPS.

**BS role:** feasibility FLAG only (High/Medium/Low), **never a numeric term** (prototype reproduced Group A/B, Cliff d=+0.98 → additive use is circular). **Current status: PENDING** — to be built from UniProt localization/topology + CSPA + SURFY + Vesiclepedia + EV-surface proteomics; NOT ExoCarta / TNBC-relevance / generic EV-presence (circular).

**Ranking rule**
1. Sort all pairs by TPS (desc); ties → higher coverage, then higher AFS.
2. Prioritized shortlist = **Coverage ≥ 2/3 AND BS ≠ Low** (BS-Low exclusion applies once BS is built).
3. Excluded pairs are retained with an `Exclusion_reason` — nothing hidden.

**Implemented results (this dataset):** 200 pairs — coverage 3/3=39, 2/3=137, 1/3=24; shortlist (≥2/3)=176; TPS 0.106–0.803. Weight sensitivity vs equal: Spearman 0.94–0.99 (top-10 7–10/10) → ranking robust to reasonable reweighting. Group A vs B (sanity only): A median 0.358 > B 0.304, MWU p<0.001, Cliff d=+0.29 — supportive; the composite reverses AFS's B-bias because PS and SS favor A.

**Interpretation (mandatory language):** TPS = *an integrated computational prioritization score representing combined structural, energetic, and prior biological/network evidence for a receptor–candidate pair.* Higher TPS = higher **computational priority for experimental validation** — NOT probability of binding, binding affinity, validated interaction, targeting success, or proof of targeting.

**Critical limitation:** the 200 pairs have **no experimentally labelled interaction outcomes**. Equal weights are a transparent methodological choice; the ranking is **not experimentally calibrated**; sensitivity analysis demonstrates **methodological robustness, not biological validation**; experimental validation is still required.

**No ML** (no labels → unjustifiable). **No genomics tools** (answer no necessary question here).
