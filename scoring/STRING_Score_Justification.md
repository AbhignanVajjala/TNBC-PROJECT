# STRING Score (SS) — Feature and Methodology Justification

*EXO-RANK / TNBC. Primary data: `outputs/STRING INFO.xlsx`. No ML, no raw-file edits, no TPS.*
Legend: **[LIT]** published/official, **[DATA]** our finding, **[CHOICE]** our decision.

---

## 1. Dataset audit [DATA]
- **200 rows** = 20 receptors × 10 candidates. **21 unique candidate proteins.** No duplicate (Target, Protein).
- **Group is labelled 'A'/'B'** (100 each) — *not* the 1–10 group numbers used in the AlphaFold/PRODIGY sheets. → integration must join on **(Target No., Protein)**, not (Target, Group).
- Columns: Target No., Receptor, Group, Protein, **4 evidence channels** + **Combined Score**.
- **Channels are free text** (e.g. `"yes (score 0.083)"`, `"none / insignificant"`), not numbers → parsed with regex for analysis. Combined Score is numeric **0–1**.
- **Only 64/200 pairs have any STRING result; 136 are blank** (no evidence returned).
- Channels present: **Co-Expression, Experimental/Biochemical, Curated Databases, PubMed text-mining.** The other 3 STRING channels (neighborhood, fusion, co-occurrence) are absent — expected, as those are genomic-context signals ~0 for human PPIs.
- Sanity: **EGFR–ANXA2 = 0.958**, matching the project's known example exactly.

## 2. STRING methodology [LIT]
The combined score is a **calibrated confidence ≈ the probability that a functional association exists**, benchmarked against known pathways/complexes (Szklarczyk et al., STRING). Channels are integrated **probabilistically with a prior correction**: the prior (chance of a random pair interacting) is removed from each channel, the channels are combined as `1 − ∏(1 − sᵢ)`, then the prior is added back. Reported scale **0.15–0.999** (150–999 in downloads). It reflects **functional association**, **not** physical binding affinity.

## 3. What the combined score means [LIT]
A benchmarked probability-like confidence that the two proteins are biologically associated. 0.4 ≈ medium, 0.7 ≈ high, 0.9 ≈ highest confidence. It is STRING's standard, directly-usable output.

## 4. Evidence-channel analysis [DATA]
Correlation of each parsed channel with the Combined Score (n=64):
| channel | Pearson vs combined |
|---|---|
| text-mining | **0.952** |
| experimental | 0.546 |
| database | 0.445 |
| co-expression | 0.024 |

**Provenance is the headline finding:** the dominant channel is **text-mining for 62 of 64 pairs (only 2 experimental).** So these combined scores mostly mean *"co-mentioned in the literature,"* the **weakest** evidence type (project §21) — not experimentally demonstrated interaction.

## 5. Redundancy analysis [DATA]
`Combined vs 1 − ∏(1 − channels)` → **Pearson 0.990.** This *reproduces* STRING's own integration: **the channels are already inside the combined score.** Adding them as separate SS features would **double-count**. → **Do not build SS from channels.**

## 6. Missing-data policy [LIT+CHOICE]
- 136/200 pairs returned **no STRING evidence**. STRING does not report links below ~0.15, and **absence of evidence ≠ evidence of absence.**
- **[CHOICE] Missing STRING = NA, never 0.** A pair with strong AFS+PS but no STRING is a **potentially novel candidate**, not a negative — zero-imputation would wrongly penalize exactly the novel hits the platform is meant to surface.

## 7. Normalization [CHOICE]
Combined Score already lies on STRING's **calibrated 0–1 scale** (observed 0.403–0.999). **[CHOICE] Use it directly; apply NO min-max.** Min-max would rescale 0.403→0 and 0.999→1, **destroying the calibrated probability meaning** (a 0.40 "medium-confidence" link is not "zero evidence"). No transformation is the correct transformation.

## 8. Group A vs B (sanity check only) [DATA]
Among scored pairs: **A median 0.708 vs B 0.575, MWU p=0.015, Cliff's d +0.38.** Also **coverage differs: A has evidence for 44/100 pairs, B for 20/100.** So Group A candidates have both *more* and *stronger* prior evidence — a coherent biological sanity check (selected candidates are better-studied). *Not used to choose the method.*

## 9. αvβ3 handling (target 6) [DATA+CHOICE]
The file gives a **single combined score per candidate** for αvβ3 (e.g. FN1 0.999, THBS1 0.999, ITGB1 0.999, ITGA6 0.915) — it does **not** contain separate candidate→ITGAV and candidate→ITGB3 columns. So the subunit provenance is **not recoverable from this file**. **[CHOICE]** Use the provided score as-is, but **flag** that we cannot verify which subunit it reflects; ideally re-query both subunits and retain max(ITGAV, ITGB3) with both raw values (project §23). Do **not** claim it is an αvβ3-heterodimer-specific score.

## 10. Independence from AFS / PS [DATA]
| SS vs | Pearson | Spearman |
|---|---|---|
| **AFS** | **+0.003** | +0.019 |
| **PS (ΔG)** | +0.250 | +0.077 |

**SS is essentially orthogonal to AlphaFold and PRODIGY.** It contributes a genuinely **independent evidence dimension** — prior biological/network knowledge, distinct from predicted structure (AFS) and predicted energetics (PS). This validates the three-layer design.

## 11. Final recommended SS formula [CHOICE]
> **SS = STRING combined score, used directly (0–1). NA where no STRING result.**
> Retain the four parsed channel scores + `dominant_channel` + `has_string_evidence` as **provenance descriptors** (not in the score). Built in `scoring/string_score.py` → `outputs/string_score.csv`.

This is **Option A/B** (they coincide — the score is already normalized). Rejected: Option C (weighted channels) — redundant with combined (r=0.99) and adds arbitrary weights.

## 12. Justification for every transformation
- **No normalization:** combined is already a calibrated 0–1 probability; rescaling destroys meaning. *(none applied)*
- **No channel reweighting:** channels are already integrated into combined (r=0.990). *(avoided double-counting)*
- **Missing → NA:** absence ≠ negative; preserves novel-candidate logic.
- **Channels kept as descriptors:** exposes provenance (critical, since 62/64 are text-mining-driven).
- **αvβ3 as-is + flag:** single score in file; subunit split not recoverable.

---

## Explicit answers
- **A. What biological information does STRING add?** Prior **biological/network association evidence** (functional association confidence from co-expression, experiments, databases, literature) — **orthogonal to structure (AFS, r=0.003) and energetics (PS, r≈0.08–0.25)**. It separates *evidence-supported* from *potentially novel* candidates.
- **B. Is the combined score already sufficient?** **Yes.** It is a calibrated probability that already integrates all channels; it is STRING's standard output.
- **C. Would adding individual channels double-count?** **Yes** — combined = `1−∏(1−channels)` (r=0.990); channels are already inside it.
- **D. How to handle missing/no-evidence pairs?** **NA, never 0** (136 pairs). Absence of evidence ≠ negative; treat as potentially novel in the eventual TPS.
- **E. Exact SS formula?** **SS = STRING combined score (0–1), as-is; NA if absent.** Channels retained as provenance descriptors.
- **F. Literature-supported or provisional?** **Literature-supported** — the combined score is STRING's benchmarked, calibrated output; using it directly introduces **no custom weighting**. This is the most defensible of the three layers. **Caveat [DATA]:** in *our* dataset the combined scores are ~97% text-mining-driven, so SS should be read as **"literature-association evidence," interpreted with the provenance descriptors**, not as experimental interaction proof.

---

## REVISION (2026-09-12) — Option B adopted per project decision

The project chose a **project-specific evidence-quality reweighting** over the STRING combined score, to prioritize experimental/curated evidence over text co-mention.

> **FINAL: SS = 0.40·Experimental + 0.25·Database + 0.20·PubMed + 0.15·Co-expression** (parsed channel scores). STRING combined kept as a reference/QC column (NOT a component — avoids double-counting). Missing → NA. Built: `scoring/string_score.py` → `outputs/string_score.csv`.

**Weights are PROVISIONAL (not validated).** Weight-sensitivity analysis (`scoring/string_weight_sensitivity.py` → `outputs/string_weight_sensitivity.csv`):
- All reasonable channel weightings rank pairs the same: Spearman ρ ≥ 0.97, top-10 overlap 9–10/10 (equal-weights ρ=0.97) → **ranking is robust to weight choice** (the defensible claim).
- SS_custom vs STRING combined: r=0.72, top-10 overlap 6/10 → the reweighting genuinely shifts priority toward experimental pairs.
- Robust top-8 (top-10 under every weighting): EGFR~ANXA2, EGFR~FN1, EGFR~GAPDH, αvβ3~{FN1,ITGB1,MFGE8,THBS1}, CD44~FN1.

**Caveats:** data is text-mining-dominated (exp 24/64, db 6/64, coexp all ≤0.15) so the hierarchy has limited leverage; SS_custom is low in absolute terms (relative priority, not a probability); Group A>B weakens to n.s. (p=0.10) confirming the earlier gap was text-driven; 9/24 experimental values are homolog-transferred.

**4th layer (BS) constraint:** BS must use INDEPENDENT biological references (exosome/EV, TNBC relevance, localization) — NOT literature again — to avoid double-counting biology across SS and BS.

### Weights: LOCKED as provisional (2026-09-12)
- **Math check:** 0.40 + 0.25 + 0.20 + 0.15 = **1.00** (verified). (A transient note of "0.95" came from mis-typing database as 0.20; the code uses 0.25.)
- **Rationale, stated honestly (two parts):**
  - *Ordering* Experimental > Database > PubMed > Co-expression is **justified** — evidence-quality hierarchy (direct experimental > curated knowledge > co-mention ≠ interaction > context), consistent with STRING's own reliability tiers. NOT arbitrary.
  - *Exact values* 0.40/0.25/0.20/0.15 are a **provisional methodological choice**, not derived/fitted. Explicitly NOT "validated."
- **Why defensible:** weight-sensitivity shows the ranking is robust to reasonable weight changes (Spearman ρ ≥ 0.97; top-10 overlap 9–10/10; equal-weights ρ = 0.97). Claim = "ranking robust to weights," never "weights validated."
