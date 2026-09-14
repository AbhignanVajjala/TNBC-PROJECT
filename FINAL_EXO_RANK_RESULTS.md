# FINAL EXO-RANK RESULTS — TNBC Targeted-Exosome Prioritization

*Applying the LOCKED methodology (no score changes). Raw data unmodified. This is a computational **prioritization** framework — not proof of binding.*

## 1. Final methodology (locked)
Three quantitative layers per pair (all 0–1): **AFS** (AlphaFold structure/interface confidence), **PS** (PRODIGY winsorized ΔG), **SS** (STRING combined score). **TPS = mean of available {AFS, PS, SS}** (equal ⅓ weights, renormalized; never impute 0/median). **Coverage = #available/3**. **BS** = ordinal biological-feasibility FLAG (High/Medium/Low; UniProt-derived), *not* part of TPS. **Preferred shortlist = Coverage ≥ 2/3 AND BS ≠ Low.**

## 2. The 121-pair preferred shortlist
200 pairs → **176** (Coverage ≥ 2/3) → **121** (BS ≠ Low; 55 removed as BS-Low). Full list: `outputs/final_preferred_shortlist.csv`. Shortlist TPS quartiles: Q25 0.289, median 0.358, Q75 0.441. Group enrichment: **90/100 Group-A vs 31/100 Group-B** candidates survive.

## 3. Top 10 (by TPS)
| # | Receptor | Candidate | TPS | Cov | BS | SS | Class |
|---|---|---|---|---|---|---|---|
| 1 | αvβ3 integrin | MFGE8 | 0.803 | 2/3 | High | 0.985 | evidence-supported |
| 2 | αvβ3 integrin | THBS1 | 0.757 | 2/3 | High | 0.999 | evidence-supported |
| 3 | αvβ3 integrin | ITGB1 | 0.752 | 2/3 | High | 0.999 | association |
| 4 | αvβ3 integrin | ITGA6 | 0.739 | 2/3 | High | 0.915 | association |
| 5 | ROR1 | MFGE8 | 0.716 | 2/3 | High | NA | **potentially novel** |
| 6 | αvβ3 integrin | FN1 | 0.708 | 2/3 | High | 0.999 | evidence-supported |
| 7 | CD44 | FN1 | 0.639 | 2/3 | High | 0.999 | evidence-supported |
| 8 | EGFR | FN1 | 0.634 | 2/3 | High | 0.944 | association |
| 9 | EGFR | GAPDH | 0.606 | 2/3 | Medium | 0.955 | association (moonlighting) |
| 10 | ICAM1 | ITGB1 | 0.603 | 2/3 | High | 0.967 | association |

## 4. Top 20
Adds (11) GPNMB~THBS1 *novel*, (12) RON~THBS1 *novel*, (13) **CD44~THBS1 [Tier1, 3/3]**, (14) CXCR4~FN1, (15) **EpCAM~CD44 [Tier1, 3/3]**, (16) IGF1R~FN1, (17) EpCAM~ANXA2, (18) ICAM1~FN1, (19) **CD44~LGALS3BP [Tier1, 3/3]**, (20) EGFR~ANXA2 (3/3, SS 0.958). Full ranks in the shortlist CSV.

## 5. Robust candidates (robustness tiers)
Thresholds derived from the shortlist distribution: "high TPS" = top quartile (≥0.441); "stable" = rank swing ≤ median (21) across the 5 weight schemes.
- **Tier 1 (5 pairs — high TPS, 3/3 coverage, BS High, stable):** CD44~THBS1, EpCAM~CD44, CD44~LGALS3BP, CD44~ITGB1, CXCR4~ITGB1. **The most defensible — all three independent lines agree.**
- **Tier 2 (16):** high TPS, 2/3 coverage, BS High/Medium, stable (incl. the αvβ3 cluster, EGFR~ANXA2, ROR1~MFGE8).
- **Tier 3 (100):** lower TPS or weight-sensitive or Medium BS.
- **Tier 4:** BS-Low (excluded from shortlist).

Most weight-sensitive pairs (report, don't over-trust): MFGE8@T7, THBS1@T7, SDCBP@T12 (rank swings 57–76).

## 6. Receptor-level findings (`outputs/receptor_top_candidates.csv`)
αvβ3 has the strongest candidate slate (MFGE8/THBS1/ITGB1/ITGA6/FN1 all High-BS, SS≈0.9–1.0). CD44, EGFR, EpCAM, ICAM1, ROR1 also carry strong top candidates. **FN1, THBS1, MFGE8, ANXA2, CD44** recur as the best candidates across many receptors — consistent with promiscuous ECM/adhesion ligands.

## 7. Candidate-level findings (`outputs/candidate_summary.csv`)
Broadly-promising candidates (high median TPS across receptors, many preferred pairs, High/Medium BS): **FN1, THBS1, MFGE8, CD44, ITGB1, ANXA2**. These appear repeatedly in the top-20, i.e. broadly promising rather than one-receptor-specific — but note this partly reflects their promiscuous surface/ECM biology (a caveat, not just a strength).

## 8. Biological interpretation (known vs association vs novel)
Using STRING as the *prior-association* axis (text-mining-dominated, so "association/literature," **not** experimental) + targeted literature:
- **Evidence-supported (established biology + high SS):** αvβ3~FN1/THBS1/MFGE8 (canonical RGD-integrin ligands), EGFR~ANXA2 (SS 0.958; documented ANXA2–EGFR regulation), CD44~FN1, EpCAM~CD44, ICAM1~ITGB1.
- **Potentially novel (no reported direct interaction; NA STRING):** **ROR1~MFGE8, RON/MST1R~THBS1, GPNMB~THBS1, IGF1R~ANXA2** — literature confirms the individual proteins are TNBC-relevant but the *pairs* are undocumented.

## 9. αvβ3 special analysis
**STRING caveat:** the αvβ3 SS values derive from candidate↔ITGAV/ITGB3-subunit evidence, **not** a heterodimer-specific interaction score — not claimed as such. Applying the locked rules to target 6: **Preferred (survive):** FN1, THBS1, ITGB1, ITGA6, MFGE8 (High BS, 2/3, SS 0.92–1.0) + GAPDH (Medium, 2/3). **Excluded:** PGK1 (BS-Low *and* coverage 1/3), LDHA/ALDOA (BS-Low), ENO1 (coverage 1/3). The surviving five are genuine integrin ligands/partners (FN1/THBS1/MFGE8 carry RGD; ITGB1/ITGA6 are integrin subunits) — biologically the strongest slate in the dataset.

## 10. Modelability-artifact analysis (mitigated, not solved)
The failure mode: cytosolic glycolytic proteins scoring high on AFS. Result under the locked framework:
| Candidate | BS | max AFS | in shortlist |
|---|---|---|---|
| PGK1 | Low | 0.764 | **0/14** |
| LDHA | Low | 0.668 | 0/17 |
| ALDOA | Low | 0.640 | 0/14 |
| PKM | Low | 0.408 | 0/10 |
| TKT | Low | 0.495 | 0/3 |
| **TPI1** | Low | **0.931** | **0/8** |
| GAPDH | Medium | 0.665 | 19/20 (retained) |
| ENO1 | Medium | 0.702 | 11/12 (retained) |

All six **pure-cytosolic** glycolytic candidates are removed by BS-Low — including **TPI1, which had the highest AFS (0.931) of any candidate.** The two with documented surface-moonlighting (GAPDH, ENO1) are retained at Medium. **The framework mitigates the artifact; it does not "solve" it** — GAPDH/ENO1 EV-surface presentation remains uncertain.

## 11. Group A/B sanity check (NOT a training label)
| Layer | A median | B median | MWU p | Cliff's d |
|---|---|---|---|---|
| TPS | 0.358 | 0.304 | <0.001 | **+0.29 (A>B)** |
| AFS | 0.276 | 0.312 | 0.075 | −0.15 (B>A, artifact) |
| PS | 0.242 | 0.177 | 0.011 | +0.24 |
| SS | 0.708 | 0.575 | 0.015 | +0.38 |
Shortlist enrichment: **A 90/100 vs B 31/100.** The integrated TPS recovers the expected A>B (which AFS alone inverts) — supportive sanity check only.

## 12. Source contribution (leave-one-source-out; `outputs/source_contribution_analysis.csv`)
Spearman vs full TPS: AFS-only **0.40**, PS-only 0.52, SS-only 0.79 (n=64), AFS+PS 0.69, AFS+SS 0.75, PS+SS 0.82. **No single source reproduces the integrated ranking** (AFS-only diverges most, 0.40) → combining genuinely changes the ranking and adds information; the composite is not a proxy for any one layer.

## 13. Novel vs evidence-supported (summary)
- **Evidence-supported / association:** αvβ3~{FN1,THBS1,MFGE8}, EGFR~ANXA2, CD44~FN1, EpCAM~CD44, ICAM1~ITGB1 — describe as *computationally prioritized, biologically consistent*.
- **Potentially novel:** ROR1~MFGE8, RON~THBS1, GPNMB~THBS1, IGF1R~ANXA2 — describe strictly as **"computationally prioritized candidates for experimental validation,"** never "newly discovered interactions."

## 14. Recommended experimental panel (`outputs/final_experimental_panel.csv`)
**10 pairs, 10 distinct receptors, 6 candidates** — diverse by receptor, candidate, evidence profile (5 evidence-supported + 4 potentially novel + 1 robust), chosen over "top-10 TPS" (which would over-represent αvβ3):
1. **αvβ3~FN1** — evidence-supported anchor (RGD ligand, SS 0.999); positive-control-like, validates the pipeline.
2. **EGFR~ANXA2** — evidence-supported, 3/3, SS 0.958; flagship convergent pair.
3. **EpCAM~CD44** — Tier1, 3/3, SS 0.971; two CSC markers.
4. **CD44~THBS1** — Tier1, 3/3, High BS; most robust profile.
5. **ROR1~MFGE8** — *potentially novel*; top novel TPS (0.716); both TNBC-enriched.
6. **RON/MST1R~THBS1** — *potentially novel*; Tier2.
7. **ICAM1~ITGB1** — evidence-supported (SS 0.967); integrin-adhesion axis.
8. **CXCR4~FN1** — evidence-supported (SS 0.857); CXCR4 = key metastasis receptor.
9. **IGF1R~ANXA2** — *potentially novel*; hypothesis-generating.
10. **GPNMB~THBS1** — *potentially novel*; GPNMB is a validated TNBC ADC target.
*Rationale:* a diverse panel spanning receptors/candidates/evidence-profiles gives more information per experiment than many pairs on one receptor; positive-control-like pairs (1,2) calibrate the assay, novel pairs (5,6,9,10) test the platform's discovery value. THBS1/MFGE8 promiscuity is a caveat to control for.

## 15. Limitations
No experimental interaction labels → prioritization, not prediction; equal weights are a transparent choice, not calibrated. AFS/PS share the AlphaFold structure. SS is 68% missing and text-mining-dominated (not experimental). BS is UniProt-canonical (conservative for non-canonical EV-surface topology) and still correlated with the selection axis. αvβ3 SS is subunit-derived. n=200, one receptor (αvβ3) dominates the top. PRODIGY/AFS run on predicted structures.

## 16. Judge-ready explanation
**What to prioritize:** the Tier-1 3-source-supported pairs (CD44~THBS1, EpCAM~CD44, CD44~LGALS3BP, CD44~ITGB1, CXCR4~ITGB1) and the αvβ3 integrin-ligand cluster as evidence-supported anchors; ROR1~MFGE8, RON~THBS1, GPNMB~THBS1, IGF1R~ANXA2 as the most promising *novel* hypotheses. **Why:** each surviving pair has ≥2 independent computational lines of support and passes a surface-feasibility check that removes the cytosolic-glycolytic artifacts. **A high TPS means** convergent structural + energetic + prior-association evidence that a pair is worth validating first — **not** that it binds, and **not** an experimentally confirmed or targeting-efficient interaction.

---
*See `FINAL_TNBC_SCORING_METHODOLOGY.md` for the locked methodology and `biological_feasibility_methodology.md` for BS. Outputs: final_preferred_shortlist / receptor_top_candidates / candidate_summary / final_experimental_panel / source_contribution_analysis / final_rank_stability .csv.*
