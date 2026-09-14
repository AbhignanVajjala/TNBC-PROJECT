# External Calibration of the AlphaFold Score — Methodology Research

**EXO-RANK / TNBC exosome prioritization.** Prepared for methodology approval.
**No model trained, no AlphaFold rerun, no TNBC data modified.** All factual claims cited.

---

## 1. Benchmark comparison

| Benchmark | # complexes | Type | Exp. ref structures | PDB IDs | DockQ calc? | AF preds included? | AF confidence incl? | AF2/ColabFold compat | Ab/Ag | Membrane/EC | Redundancy control | License | Compute |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Docking Benchmark 5.5** (Vreven 2015; Guest 2021) | ~253 (incl. 67 Ab-Ag) | hetero/homo, bound+unbound | Yes (crystallography) | Yes | Yes | **No** (must predict) | No | Yes | Yes (separable) | some | difficulty-classed, not seq-clustered | free/academic | **high if we predict all; low on a subset** |
| **Yin & Pierce 2023 AF-Multimer eval** (btad424) | hundreds | multi-chain | Yes | Yes | Yes | **Yes (already run)** | **Yes (ipTM/pTM/pDockQ)** | Yes (AF-Multimer) | mixed | mixed | paper-defined | free | **≈0 (reuse)** |
| CAPRI targets | tens/round | blind PPI | Yes | Yes | Yes | community models | partial | varies | some | some | low | free | medium |
| pDockQ/FoldDock set (Bryant 2022) | thousands (heterodimers) | hetero | Yes | Yes | Yes | Yes | Yes | Yes | few | mixed | 30% seq-id clustered | free | low-medium |

**Notes**
- DB5.5 is the community-standard *docking* benchmark: high-quality experimental references, well-curated, difficulty labels — but it ships **structures, not AF predictions**, so using it means running AF ourselves (GPU cost) [Vreven 2015; Guest 2021].
- The **Yin & Pierce 2023** evaluation and the **pDockQ / pDockQ2** papers already pair **AF-Multimer confidence features with DockQ labels** — reusing their released tables gives calibration data at ~zero compute [Yin & Pierce 2023; Bryant 2022; Zhu 2023].

**Recommendation:** *primary* = a **heterodimer subset of DB5.5** (clean references, transferable to receptor–candidate soluble/EC interactions), *only if* we can reuse or cheaply generate AF predictions; *backup / lite* = **reuse published AF-Multimer+DockQ tables** (Yin-Pierce / pDockQ2) to avoid any prediction cost. Exclude antibody–antigen (distinct interface biology) from the main model.

---

## 2. DockQ as the target

DockQ combines Fnat, LRMS and iRMS into a single continuous [0,1] interface-quality score, reproducing the CAPRI classes [Basu & Wallner 2016]:

| DockQ | class |
|---|---|
| < 0.23 | Incorrect |
| 0.23–0.49 | Acceptable |
| 0.49–0.80 | Medium |
| ≥ 0.80 | High |

- It is computed **against an experimentally solved reference complex** — it measures *model quality*, **not binding affinity**. We will never call it ΔG/Kd.
- **Recommendation: (A) continuous DockQ regression as primary target** (we want a graded prioritization signal; evaluate with Spearman), **plus (B) a secondary binary "acceptable" (DockQ≥0.23) classifier** because DockQ is zero-inflated (many incorrect models) and a calibrated acceptance probability is useful. Ranking (C) is implied by (A). Rationale: continuous preserves the most information and matches how AFS is used (ordering candidates).

---

## 3. Features

Availability of our four current features in the benchmark: **ipTM, pTM, mean pLDDT, PAE are all standard AF2/ColabFold outputs** and are present wherever AF-Multimer is run [Evans 2022]. Candidate interface-specific replacements:

| Feature | Definition | Interface meaning | Evidence vs DockQ | AF2 avail | Direct/calc | Redundancy |
|---|---|---|---|---|---|---|
| **ipTM** | interface predicted TM-score | confidence in relative chain placement | Best single built-in predictor of interface accuracy [Yin & Pierce 2023] | Yes | direct | low (orthogonal in our data) |
| **pTM** | global predicted TM | whole-complex topology | weaker than ipTM | Yes | direct | ~0.87 w/ our median PAE |
| **mean pLDDT** | per-residue local confidence | local fold, not interface | weak alone | Yes | direct | compressed |
| **interface PAE** | mean of per-interface-residue *min* cross-chain PAE | positional error *at the interface* | PAE-based interface terms drive pDockQ2 improvement [Zhu 2023] | Yes | **calc** (pae+chain boundary) | less redundant than whole-complex PAE |
| **pDockQ** | sigmoid(IF_pLDDT·log IF_contacts) | interface size×quality | predicts DockQ but over-scores some wrong multimers [Bryant 2022] | Yes | calc | overlaps pLDDT |
| **pDockQ2** | pDockQ variant using inter-chain PAE | adds PAE penalty | better DockQ correlation for multimers [Zhu 2023] | Yes | calc | strong baseline |
| **ipSAE** | ipTM restricted to low-PAE residue pairs, d0-adjusted | interface-focused ipTM | separates true/false better than ipTM [Dunbrack 2025] | Yes | calc | overlaps ipTM |

**Recommendation:** keep the model to **4 interpretable features — ipTM, pTM, interface PAE, mean pLDDT** — i.e. **swap whole-complex median PAE → interface PAE** (Section 4). Treat **pDockQ2 and ipSAE as baselines**, not stacked features (they overlap ipTM/PAE and hurt interpretability).

---

## 4. Interface PAE — extraction verified on our files (no rerun)

Confirmed on existing outputs (read-only sample):
- **AF3** (45 pairs): chain split from `token_chain_ids`; interface PAE computed directly.
- **AF2** (154 pairs): chain boundary from the **rank-1 PDB CA residue counts** inside `files/*.result.zip`; residue count **matches the PAE matrix dimension exactly** (`align_ok=True` on all sampled pairs). 152/154 zips present.

Defensible definition: **interface PAE = mean over interface residues of the minimum cross-chain PAE** (each residue's best-aligned partner), which isolates the interface region rather than diluting it with the whole matrix. Whole-complex median PAE saturates near the AF cap for poor models and is 0.87-correlated with pTM; interface min-PAE is less redundant and closer to what ipTM/pDockQ2 reward. **Recommendation: replace median PAE with interface PAE** in both the benchmark model and the TNBC feature table (as a new column; raw preserved).

---

## 5. AF2 vs AF3

Our TNBC set is **majority AF2/ColabFold (alphafold2_multimer_v3)** with 45 AF3 pairs. AF2 and AF3 confidence metrics are **not numerically identical** (different networks/definitions), so mixing them in one calibration is unsafe. **Recommendation: calibrate on AF2/ColabFold** to match the bulk of TNBC data; handle the 45 AF3 pairs separately (either re-predict with ColabFold for consistency, or apply an AF3-specific calibration later). Do not mix.

---

## 6. Model

Target aligned, all features directional (higher better; PAE inverted). **Primary: Ridge regression** on **standardized** features:

```
DockQ ≈ β0 + β1·z(ipTM) + β2·z(pTM) + β3·z(−interface_PAE) + β4·z(mean_pLDDT)
```

- **Ridge** (L2) is preferred: it keeps all four features and *shrinks correlated ones gracefully* (pTM/PAE collinearity) rather than arbitrarily dropping one. **ElasticNet** as a secondary sensitivity check.
- **Standardization is required** so coefficients are comparable and so the exact same transform can be transferred to TNBC (Section 10).
- **Coefficients → interpretable weights:** do **NOT** normalize `abs(raw β)`. Standardize first; if all standardized coefficients are positive (expected, given aligned directions), **normalize the positive standardized coefficients to sum 1** and report as *relative importance weights*, flagging any sign violation for review. Alternatively (cleaner) use the **calibrated model prediction itself as AFS** and drop the sum-to-1 constraint — sum-to-1 is a presentation nicety, not a statistical requirement.

---

## 7. Data splitting / leakage

Random splits leak: homologous complexes in both train and validation inflate scores. Standard fix in structure ML is **sequence-identity clustering** — AF2 itself clustered training data at **30% identity / 90% coverage with MMseqs2/Linclust** [Jumper 2021; and common benchmark practice]. **Recommendation: leave-cluster-out cross-validation** using **MMseqs2 30% identity, 90% coverage** clusters over the benchmark chains; no cluster appears in both train and validation. Family/CATH-based splitting is an acceptable stricter alternative but MMseqs2 clustering is the most practical rigorous choice.

---

## 8. Baselines

Evaluate the learned model against, on the **same leave-cluster-out folds**:
1. **ipTM alone**
2. **AlphaFold-Multimer style: 0.8·ipTM + 0.2·pTM** [Evans 2022]
3. **pDockQ** [Bryant 2022] (if interface computable)
4. **pDockQ2** [Zhu 2023]
5. learned 4-feature Ridge model

Metrics: continuous → **Spearman** (primary), Pearson, RMSE/MAE; binary → **AUROC, AUPRC**. No extra metrics.

---

## 9. Feature ablation

Nested, evaluated identically: `[ipTM] → +pTM → +interface PAE → +pLDDT`. Report Spearman gain at each step to show whether each feature adds *genuine* predictive information (guards against keeping redundant features).

---

## 10. Transferability / scaling (critical)

The current TNBC `_N` columns use **global min-max within the 200 TNBC pairs** — this is **dataset-internal and NOT transferable**: a model calibrated on benchmark-scaled features cannot be applied to differently-scaled TNBC values. Correct approach (**Option 2**):

> **Fit the StandardScaler on the benchmark TRAIN features only, persist mean/std, and apply that exact scaler to the TNBC RAW AlphaFold features.** The calibrated model then sees TNBC features on the same scale it was trained on.

Do **not** train on the TNBC min-max columns, and do **not** re-fit a scaler on TNBC. The provisional AFS (Scheme A) keeps its existing `_N` columns unchanged; the calibrated AFS is a **separate** column produced via the persisted benchmark scaler.

---

## 11. Computational burden

- **Interface PAE on existing files:** minutes, CPU, no reruns. **Do now.**
- **Reuse published AF+DockQ tables (lite path):** ~0 GPU; effort is data wrangling.
- **Predict a DB5.5 heterodimer subset ourselves:** ColabFold on ~50–100 complexes ≈ tens of GPU-hours — feasible but non-trivial given our stated GPU unreliability. Predicting all ~250 (× multiple models) is the expensive path to avoid.
- **Smallest defensible calibration set:** ~50–80 clustered heterodimers spanning the DockQ range.

---

## 12. Major methodological risks

1. **Domain shift** — benchmark complexes ≠ TNBC receptor/exosome interfaces (EC domains, moonlighting proteins); calibrated weights may not transfer cleanly.
2. **AF2/AF3 mixing** — must not mix; 45 AF3 pairs need separate handling.
3. **DockQ zero-inflation** — many incorrect models; regression may be dominated by the incorrect class → why we add a binary acceptable head.
4. **Scaling transfer bug** — applying wrong/refit scaler silently corrupts TNBC scores (Section 10 mitigates).
5. **Redundancy** — pTM/PAE collinearity; Ridge + ablation mitigate.
6. **Small calibration set** — leave-cluster-out variance; report CIs.
7. **Interpreting β as importance** — only valid on standardized features; sign checks required.

---

## Citations
- Vreven et al. 2015, *J Mol Biol* — Docking Benchmark 5.0 / Affinity Benchmark 2. https://www.sciencedirect.com/science/article/pii/S0022283615004180
- Guest et al. 2021 — antibody–antigen expansion (DB5.5 context). https://github.com/piercelab/antibody_benchmark
- Basu & Wallner 2016, *PLOS ONE* — DockQ. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0161879
- Evans et al. 2022, *bioRxiv* — AlphaFold-Multimer (ipTM/pTM; 0.8·ipTM+0.2·pTM ranking). https://www.biorxiv.org/content/10.1101/2021.10.04.463034v1.full.pdf
- Jumper et al. 2021, *Nature* — AlphaFold2 (pLDDT/PAE; 30% MMseqs2 clustering).
- Yin & Pierce 2023, *Bioinformatics* btad424 — AF-Multimer evaluation, ipTM best interface-quality predictor. https://academic.oup.com/bioinformatics/article/39/7/btad424/7219714
- Bryant et al. 2022, *Nat Commun* — pDockQ / FoldDock. https://www.nature.com/articles/s41467-022-28865-w
- Zhu et al. 2023, *Bioinformatics* — pDockQ2 (inter-chain PAE). (see AF-Multimer eval refs)
- Dunbrack 2025, *bioRxiv* — ipSAE. https://www.biorxiv.org/content/10.1101/2025.02.10.637595v2
