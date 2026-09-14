# EXO-RANK — Complete Mathematics & Statistics Reference

*Every formula, transform, statistical test, and scoring equation used in the project, with where it
was applied and the real values obtained. Full numeric tables: `EXO_RANK_STATISTICAL_APPENDIX.md`.*
Notation: `x̄` = mean, `σ` = std, `N` = count, `rank(·)` = rank transform.

---

## 1. Normalization & transforms

**1.1 Global min–max normalization** (higher-is-better features)
```
X_N = (X − X_min) / (X_max − X_min)          ∈ [0,1]
```
Min/max taken over all 200 pairs. Used for: ipTM, pTM, mean pLDDT.

**1.2 Inverted min–max** (lower-is-better)
```
X_N = 1 − (X − X_min) / (X_max − X_min)
```
Used for: interface PAE, median PAE, PRODIGY ΔG (more-negative → higher).

**1.3 Winsorization** (outlier capping, not deletion) — applied to ΔG before min–max
```
x' = min( max(x, P1), P99 )      P1,P99 = 1st/99th percentiles
```
Here `[P1,P99] = [−46.15, −4.90]` kcal/mol. Prevents one artifact (ΔG −69.1) from dominating.

**1.4 Log transform** — used in PRODIGY analysis to make Kd comparable
```
log10(Kd)      (Kd spans 2×10⁻⁵¹ … 3×10⁻⁴ M → 47 orders of magnitude)
```

---

## 2. Descriptive statistics
For each feature: `mean = (1/N)Σxᵢ`, `median`, `σ = sqrt((1/N)Σ(xᵢ−x̄)²)`, min, max, quartiles.

**Skewness** (Fisher–Pearson) — used to judge which features discriminate
```
g₁ = m₃ / m₂^{1.5},   mₖ = (1/N) Σ (xᵢ − x̄)ᵏ
```
Key values: ipTM_N skew **+1.98** (right-skewed → strong discriminator); pLDDT_N **−0.87** (compressed); ΔG **−2.76** (heavy negative tail → winsorize).

---

## 3. Association / correlation

**3.1 Pearson r** (linear) — redundancy detection
```
r = Σ(xᵢ−x̄)(yᵢ−ȳ) / sqrt( Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)² )
```
Key results: mean PAE vs median PAE **0.91** (→ drop mean PAE); ΔG vs contacts **−0.985**; STRING combined vs `1−∏(1−channels)` **0.990**; pTM vs median PAE **0.87**.

**3.2 Spearman ρ** (monotonic; Pearson on ranks) — used for ranking comparisons & source independence
```
ρ = Pearson( rank(x), rank(y) )       (= 1 − 6Σdᵢ²/(N(N²−1)) if no ties)
```
Key results (source matrix): AFS–PS **−0.13**, AFS–SS **+0.02**, PS–SS **+0.08** (near-independent → combine).

**3.3 R² (coefficient of determination)** via OLS least squares — used to prove ΔG redundancy
```
β = argmin ‖y − Xβ‖²        (solved with numpy.linalg.lstsq)
R² = 1 − SS_res/SS_tot = 1 − Σ(yᵢ−ŷᵢ)² / Σ(yᵢ−ȳ)²
```
ΔG regressed on the 6 contact categories + 2 NIS % → **R² = 1.0000** → ΔG carries all of it (PS = ΔG alone).

---

## 4. Hypothesis tests & effect sizes (Group A/B, BS — sanity checks only)

**4.1 Mann–Whitney U** (non-parametric two-group; chosen because scores are skewed/bounded, not normal)
```
U₁ = R₁ − n₁(n₁+1)/2      (R₁ = sum of ranks of group 1)
U  = min(U₁, U₂)
```
**4.2 Cliff's delta** (effect size / rank-biserial)
```
δ = ( #(x>y) − #(x<y) ) / (n₁·n₂) = 2U/(n₁·n₂) − 1     ∈ [−1, +1]
```
Key: TPS A vs B δ=**+0.29** (p<0.001); SS δ=+0.38; PS δ=+0.24; AFS δ=−0.15 (the artifact); **BS vs A/B δ=+0.92** (→ BS is circular with selection → kept as filter).

**4.3 Kruskal–Wallis H** (≥3 groups) — TPS across BS = {Low, Med, High}
```
H = 12/(N(N+1)) · Σⱼ Rⱼ²/nⱼ − 3(N+1)
```
Result: p = **0.001** (TPS differs across BS categories).

---

## 5. Set / ranking metrics (sensitivity & stability)

**5.1 Top-k overlap** between two rankings A, B
```
overlap@k = | top_k(A) ∩ top_k(B) |        (reported as x/10, x/20)
```
**5.2 Rank spread** across weighting schemes
```
rank_range(pair) = max_scheme rank − min_scheme rank
```

---

## 6. Scoring formulas (the core)

**6.1 interface PAE** (derived AlphaFold feature; candidate = last chain C, receptor = rest R)
```
interface_PAE = mean over residues of ( min cross-partition PAE )
              = mean( {min_j∈R PAE[i,j] : i∈C} ∪ {min_j∈C PAE[i,j] : i∈R} )
```

**6.2 AFS (AlphaFold Score)**
```
AFS = 0.50·ipTM_N + 0.20·pTM_N + 0.15·interface_PAE_N + 0.15·mean_pLDDT_N
```

**6.3 PS (PRODIGY Score)** — single feature
```
PS = 1 − ( winsor(ΔG) − P1 ) / ( P99 − P1 )      (inverted; more-negative ΔG → higher)
```

**6.4 SS (STRING Score)**
```
SS = STRING combined score          (used as-is, already calibrated 0–1)
```

**6.5 Coverage**
```
Coverage = ( #available of {AFS, PS, SS} ) / 3      ∈ {1/3, 2/3, 3/3}
```

**6.6 TPS (final) — available-source-renormalized weighted mean, equal weights**
```
S = available sources,   wᵢ = 1/3
TPS = ( Σ_{i∈S} wᵢ·scoreᵢ ) / ( Σ_{i∈S} wᵢ ) = mean of available scores
```

**6.7 BS (feasibility flag)** — frozen ordinal rule (High/Med/Low) from UniProt topology.
Also, the **rejected** probabilistic-OR proposal (kept for the record — reliability values weren't calibrated probabilities, so an ordinal rule was used instead):
```
BS_prob = 1 − ∏_i (1 − rᵢ·eᵢ)      rᵢ = source reliability, eᵢ = evidence present
```

**6.8 Shortlist rule**
```
preferred  ⟺  Coverage ≥ 2/3  AND  BS ≠ Low       → 121 of 200 pairs
rank by TPS desc; ties → higher coverage → higher AFS
```

---

## 7. Domain / biophysical formulas (theory behind the inputs)

**7.1 Thermodynamics (ΔG ↔ Kd)**
```
ΔG = R·T·ln(Kd)   ⇔   Kd = exp(ΔG / R·T)     → ΔG and log Kd are the same information
```

**7.2 PRODIGY predictive model** (linear regression; contacts ICs + NIS)
```
ΔG = −0.09459·IC_cc − 0.10007·IC_ca + 0.19577·IC_pp − 0.22671·IC_pa
     + 0.18681·%NIS_apolar + 0.3810·%NIS_charged − 15.9433
```
(cc=charged/charged, ca=charged/apolar, pp=polar/polar, pa=polar/apolar) → this is *why* ΔG = f(contacts, NIS), R²=1.0.

**7.3 STRING combined score** (prior-corrected probabilistic integration of channels)
```
S_combined ≈ 1 − ∏_i (1 − Sᵢ')        (Sᵢ' = prior-corrected channel scores)
```

**7.4 TM-score / ipTM** (AlphaFold interface confidence)
```
TM = (1/L) Σ_i 1 / (1 + (dᵢ/d₀)²),   d₀ = 1.24·(L−15)^{1/3} − 1.8
ipTM = the same, restricted to inter-chain residue pairs (interface accuracy)
```

---

## 8. Sensitivity-analysis mathematics

**8.1 Weight-vector enumeration** (AFS sweep): all `(w₁,w₂,w₃,w₄)` on a 0.05 grid with
`Σwᵢ = 1`, `wᵢ ≥ 0`, `w_ipTM ≥ 0.35`, `w_ipTM ≥ max(others)` → 458 valid vectors.

**8.2 Agreement between schemes:** Spearman ρ of the full ranking + top-k overlap.
Result: AFS ρ **0.88–0.99**; TPS ρ **0.94–0.99** across reasonable schemes → robust.

**8.3 Leave-one-source-out:** recompute TPS on each subset, correlate vs full TPS.
Result (Spearman vs full): AFS-only **0.40**, PS-only 0.52, SS-only 0.79, AFS+PS 0.69, AFS+SS 0.75, PS+SS 0.82 → no single source is a proxy; combining adds information.

---

## 9. Quick index — method → where used
| Method | Where |
|---|---|
| min–max / inverted min–max | all feature normalization (AFS, PS) |
| winsorization | PRODIGY ΔG outlier |
| log10 | Kd analysis |
| skewness | feature discrimination check |
| Pearson r | redundancy (mean/median PAE, ΔG/contacts, STRING channels) |
| Spearman ρ | source independence, weight/ranking stability |
| OLS + R² | ΔG = f(contacts+NIS); AFS cluster redundancy |
| Mann–Whitney U + Cliff's δ | Group A/B & BS-circularity sanity checks |
| Kruskal–Wallis | TPS across BS categories |
| top-k overlap, rank range | sensitivity / robustness |
| weighted mean (renormalized) | TPS integration |
| probabilistic OR (rejected) | BS design record |

*Note: No model was trained on the 200 pairs (no labels). All of the above are classical statistics /
transparent formulas; the only "learned" component is AlphaFold's pre-trained network that produces the
structural inputs (see EXO_RANK_TECHNICAL_DOSSIER.md §G).*
