# PRODIGY Score (PS) — Feature and Weight Justification

*EXO-RANK / TNBC. Analysis on the 151 PRODIGY-complete pairs. No ML, no STRING, no raw-file edits.*
Legend: **[LIT]** = published, **[DATA]** = our 151-pair finding, **[CHOICE]** = our methodological decision.

---

## 1. Proposed formula (final recommendation)

> **PS = ΔG_norm**  (winsorized min–max, more-negative ΔG → higher score).
> **Intermolecular contacts are retained as a separate interface-size / QC descriptor — NOT weighted into PS.**

The originally proposed `PS = 0.70·ΔG_norm + 0.30·Contact_norm` is **not defensible** and is labelled **provisional/unsupported** below.

## 2. PRODIGY literature evidence [LIT]
- PRODIGY predicts ΔG from a **simple linear regression of interfacial contacts (ICs, ≤5.5 Å, split by charged/polar/apolar) plus non-interacting-surface (NIS) properties** (Vangone & Bonvin 2015, eLife; Xue et al. 2016, Bioinformatics).
- **Exact equation** (official method page):
  `ΔG = −0.09459·IC_charged/charged − 0.10007·IC_charged/apolar + 0.19577·IC_polar/polar − 0.22671·IC_polar/apolar + 0.18681·%NIS_apolar + 0.3810·%NIS_charged − 15.9433`
- Benchmark performance: Pearson r = 0.73, RMSE 1.89 kcal/mol (81 complexes).
- The **central finding of the method is that the *number of interfacial contacts* predicts affinity** — contacts are the *input*, ΔG is the *output*.
- **No published precedent** treats ΔG and contact count as two independent features in a composite score, and **no published weighting** (certainly not 70:30) exists for such a combination.

## 3. What ΔG represents
The PRODIGY-predicted Gibbs binding free energy (kcal/mol), i.e. **a weighted count of interface contacts + NIS terms**. More negative = stronger predicted affinity. It is a *derived summary of the contacts*, not an independent measurement.

## 4. What intermolecular contacts represent
The raw **count of interface residue–residue contacts** (≤5.5 Å). This is the **dominant predictor variable inside the ΔG equation** — the total is the sum of the four IC categories that ΔG is built from.

## 5. Are they independent? — **No.**
Contacts are a *constituent input* of ΔG. They cannot be independent by construction.

## 6. Correlation / R² on our 151 pairs [DATA]
| Relationship | value |
|---|---|
| ΔG vs contacts — Pearson | **−0.985** |
| ΔG vs contacts — Spearman | −0.972 |
| ΔG vs contacts — **R²** | **0.971** |
| ΔG reconstructed from 6 IC categories + 2 NIS — R² | **1.0000** |
| ΔG vs NIS_total | 0.233 (weak) |

**Verified** the prior finding: ΔG ≈ −0.985 with contacts, and ΔG is *exactly* reproduced (R²=1.000) from PRODIGY's own inputs. **Contacts add essentially no information beyond ΔG (they share 97% of variance).** Kd is a deterministic transform of ΔG (previously r=1.000) and is excluded.

## 7. Normalization recommendation [CHOICE]
ΔG has an extreme left tail (min **−69.1**, next −52.7, −39.6; median −13.8).
| method | top | 2nd | median | issue |
|---|---|---|---|---|
| plain min–max | 1.000 | 0.745 | **0.140** | the −69 outlier crushes the bulk toward 0 |
| **winsorized 1–99% min–max** | 1.000 | 1.000 | 0.216 | restores spread, keeps the outlier in the data |
| rank/percentile | 0.993 | 0.987 | 0.493 | fully outlier-proof, uniform |

> **Chosen: winsorized (1–99%) min–max.** Reason: plain min–max is distorted by a single physically-implausible ΔG (−69.1 ↔ Kd 2e-51, an extrapolation artifact of a 900-contact interface) that compresses every other pair's score. Winsorizing bounds the tail **without deleting** the observation (it stays in the raw data). Rank normalization is an equally defensible fully-robust alternative. **No observation is removed.**

## 8. Comparison of weighting schemes [DATA]
Spearman rank-correlation and top-k overlap vs **ΔG-only**:
| scheme | ρ vs ΔG-only | top-10 | top-20 |
|---|---|---|---|
| 90:10 | 0.999 | 9/10 | 19/20 |
| 80:20 | 0.998 | 9/10 | 19/20 |
| **70:30** | **0.996** | 9/10 | 19/20 |
| 60:40 | 0.995 | 9/10 | 19/20 |
| 50:50 | 0.991 | 9/10 | 19/20 |
| contact-only | 0.972 | 7/10 | 19/20 |

**Every weighting produces essentially the same ranking** (ρ ≥ 0.99). 70:30 reorders only ~1 of the top 10 relative to ΔG-alone. **The weight does no meaningful work** — because the two features are collinear.

## 9. Group A vs B (sanity check only — NOT a selection criterion) [DATA]
| scheme | A med | B med | MWU p | Cliff's d |
|---|---|---|---|---|
| ΔG-only | 0.242 | 0.177 | **0.011** | +0.24 |
| 70:30 | 0.249 | 0.184 | 0.014 | +0.23 |
| 50:50 | 0.247 | 0.196 | 0.017 | +0.23 |
| contact-only | 0.256 | 0.209 | 0.025 | +0.21 |

A > B in **every** scheme (small effect, Cliff's d ≈ +0.23). **ΔG-alone already gives the strongest, cleanest separation (p=0.011)** — so choosing ΔG-alone is *not* a case of tuning toward A > B.

## 10. Interface-size bias [DATA]
- ΔG is driven by contact **count** (r −0.985) — i.e. by **interface extent**.
- But candidate **sequence length** only weakly predicts contacts (Pearson **0.195**) and ΔG (−0.212) → the bias is *interface extent in the predicted model*, **not raw protein size**. (Contra the naive worry: FN1 is *not* among the highest-contact proteins; THBS1/CD44 are.)
- **Size-controlled diagnostic** ΔG/contact: A −0.111 vs B −0.119, p=0.19 (n.s.). → Group A's stronger ΔG comes from **more contacts, not stronger per-contact energetics**. Reported as a **diagnostic only; NOT added to PS.**

## 11. Final recommendation
**Option C: PS = ΔG_norm alone (winsorized), with intermolecular contacts retained as a separate interface-size/QC descriptor.** Do **not** combine them.

Rationale, in the required order: (1) *literature* — contacts are the input to ΔG, not an independent signal; (2) *mathematical independence* — none (R²=0.97); (3) *double-counting* — combining re-adds ΔG's dominant input; (4) *interpretability* — ΔG alone = "predicted affinity," clean; (5) *ranking robustness* — all weightings ρ≥0.99, so a second feature buys nothing; (6) *TNBC relevance* — ΔG is PRODIGY's designed affinity output.

---

## Explicit answers
- **A. Is 70:30 supported by literature?** **No.** No published basis exists for combining ΔG with contact count, nor for any 70:30 split; contacts are a *component* of ΔG.
- **B. Is 70:30 supported by our dataset?** **No.** ΔG and contacts are 97% collinear; 70:30 ≈ ΔG-alone (ρ=0.996, top-10 9/10). The weight is not doing meaningful work.
- **C. Are ΔG and contacts independent enough to combine?** **No.** Pearson −0.985, R²=0.97; ΔG is literally computed from contacts + NIS.
- **D. Should we use ΔG alone?** **Yes.** PS = winsorized ΔG_norm; contacts kept as a separate QC/interface-size descriptor.
- **E. If combining, why these weights?** We **do not** recommend combining. If one insisted, any 60–90% ΔG weight yields near-identical rankings, so the value is **arbitrary and provisional, not validated** — it should never be described as validated.

*70:30 is labelled a provisional hypothesis that the analysis does not support. PS = ΔG_norm is the defensible choice.*
