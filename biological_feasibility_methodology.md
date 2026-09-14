# Biological Feasibility Score (BS) — Methodology

*EXO-RANK / TNBC. BS is an ordinal FLAG (High/Medium/Low) per candidate, NOT a number and NOT part of TPS. Built from real UniProt evidence for the 21 candidates. Implemented in `scoring/build_bs.py` → `outputs/biological_feasibility_score.csv`.*

## Purpose
Answer one question the quantitative layers cannot: *can the candidate exosomal protein plausibly be presented on the OUTER EV/exosome surface, where it could physically access a cell-surface receptor?* AFS/PS/SS say nothing about whether the ligand can even be in the right place.

## Definition
A **feasibility classification** (not a probability): High / Medium / Low, a property of the **candidate protein** (one flag per candidate, applied across all 20 receptors).

## Sources (independent of candidate selection)
- **UniProt** subcellular location + topology (transmembrane, signal peptide, GPI/lipidation) — the **primary, fetched, verifiable** evidence (`rest.uniprot.org`, accessions in the output).
- **CSPA** (experimental surfaceome) [Bausch-Fluck 2015], **SURFY** (predicted surfaceome) [Bausch-Fluck 2018], **Vesiclepedia** (EV presence — *supporting, not surface*) [Pathan 2019] — supporting context; **not programmatically retrieved this build** (marked as such, not guessed).
- **Excluded (would be circular):** ExoCarta (used in selection), TNBC relevance, generic EV presence.

## Inclusion / exclusion rules
EV *presence* ≠ surface exposure. A cytosolic protein detected in EVs does **not** automatically get High. Generic "Membrane" without cell-surface/secreted context is treated as weak (Medium at most).

## Classification rule (FROZEN before scoring)
- **HIGH:** (transmembrane AND "Cell membrane" localization) OR GPI-anchor OR (signal peptide AND Secreted/Extracellular) OR explicit "Cell surface". → native surface/secreted biology.
- **LOW:** no external annotation (Cell membrane / Cell surface / Secreted / Extracellular / Membrane) AND no transmembrane / signal peptide / GPI. → purely intracellular.
- **MEDIUM:** otherwise — peripheral-membrane, dual/moonlighting (cytosolic protein with a documented cell-membrane note), or secreted-without-signal (unconventional).

## Missing-evidence policy
UniProt localization/topology was available for all 21 (well-characterized human proteins). Where a specific database (CSPA/SURFY/EV-surface proteomics) was not retrieved, it is marked "not retrieved," never guessed. No BS value was invented.

## Conflicting-evidence policy
Dual localization (intracellular + external) sets `Conflict_flag = True` and lands the protein in **Medium** unless it also has canonical surface/secreted topology. Moonlighting cases (ENO1, GAPDH, ANXA2, HSP90AA1, EEF1A1) are Medium, not forced to High or Low; the reason column states why.

## Data-integrity correction
The ExoCarta filename mapped **TKT → Q16832, but Q16832 is DDR2** (a transmembrane receptor tyrosine kinase), not transketolase. Using it would have mis-scored cytosolic TKT as a surface protein. Corrected to **TKT = P29401** (cytosolic → Low).

## Non-circularity analysis [DATA]
BS vs Group A/B (candidate level): **Cliff's d = +0.92, p = 5×10⁻³³** — BS **remains strongly associated with Group A/B**, because surface/extracellular localization was implicitly part of candidate selection. Cross-tab: A = 9 High / 3 Medium / 0 Low; B = 0 High / 3 Medium / 6 Low. **Honest conclusion: BS is substantially correlated with the selection split → it must stay a FLAG, not a numeric score.** It is *not identical*, though: within-group disagreements (ANXA2/HSP90AA1/SDCBP in A are Medium; ENO1/GAPDH/EEF1A1 in B are Medium) show BS adds evidence-based within-group resolution.

## Independence analysis [DATA]
BS (ordinal) vs quantitative layers: Spearman AFS **−0.18**, PS +0.20, SS +0.32, TPS +0.26; Kruskal–Wallis of TPS across BS categories p=0.001. BS is a distinct dimension, and its **negative** correlation with AFS is the key value — it flags high-AFS-but-cytosolic pairs (the modelability artifact).

## Glycolytic case (the target test) [DATA]
| Candidate | BS | max AFS | interpretation |
|---|---|---|---|
| **PGK1** | **Low** | 0.764 | cytosol+mito only → surface-implausible despite highest AFS |
| **LDHA** | **Low** | 0.668 | cytoplasm only → surface-implausible |
| **ALDOA** | **Low** | 0.640 | cytoplasm only → surface-implausible |
| GAPDH | Medium | 0.665 | documented membrane moonlighting |
| ENO1 | Medium | 0.702 | plasma-membrane plasminogen receptor |

**Real UniProt evidence confirms the concern:** PGK1/LDHA/ALDOA are predominantly cytosolic with no surface annotation → Low BS correctly flags their high-AFS αvβ3 pairings as biologically questionable, while the nuanced Medium for GAPDH/ENO1 reflects genuine moonlighting.

## Limitations
- BS uses canonical annotation; EV-surface topology can be non-canonical (cytosolic proteins occasionally surface-exposed on EVs [Sci Rep 2016]) → some Low/Medium calls are conservative.
- CSPA/SURFY/EV-surface proteomics not programmatically integrated this build (UniProt-driven).
- BS remains correlated with the selection axis (Cliff d=+0.92) → informative as a filter, not as independent quantitative evidence.
- Ordinal, not calibrated; three coarse tiers.
