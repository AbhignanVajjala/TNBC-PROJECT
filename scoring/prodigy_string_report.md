# PRODIGY & STRING → Independent Scores: Analysis & Recommendation

*EXO-RANK, stage: pre-integration. Read-only analysis; no ML trained, no raw data modified.*
*Group A = groups 1–5 (biologically-selected: ECM/adhesion). Group B = groups 6–10 (background controls: glycolytic/moonlighting).*

---

## 0. Provisional AFS (done)
`outputs/afs_provisional.csv` — AFS = 0.50·ipTM_N + 0.20·pTM_N + 0.15·interface_PAE_N + 0.15·mean_pLDDT_N
(interface PAE globally min-max normalized & inverted). Range 0.106–0.964.
**Group B trends slightly higher AFS than A** (median 0.31 vs 0.28, MWU p=0.075) — structural
confidence does NOT favour the biologically-selected candidates. Contrast this with PRODIGY below.

---

## 1. PRODIGY — data analysis (151/200 pairs)

### Missing values
- **151 pairs have PRODIGY, 49 missing** (32 in Group A, 17 in Group B).
- Missing = the 45 AF3 pairs (never run in PRODIGY-v1) + 3 "no contacts" errors + 1. **Keep as NA, never 0.**
- ⚠️ Missingness is **uneven across A/B and correlated with AF version** → any A-vs-B PRODIGY comparison is on incomplete, non-random data. Flag in interpretation.

### Distributions
- **Kd spans 2e-51 to 3e-4 M (≈47 orders of magnitude)** → **log scale mandatory**; raw Kd unusable.
- **ΔG** mean −15.2, **skew −2.76**, min −69.1 — a heavy left tail of extreme values (ΔG −69 ↔ Kd 2e-51 is physically implausible, an extrapolation artifact of huge interfaces, e.g. 902 contacts). → **outlier-robust scaling required.**
- Contacts & all 6 categories are strongly right-skewed (max 902 contacts).

### Redundancy (the decisive result)
| Check | Result | Meaning |
|---|---|---|
| ΔG vs log Kd | **r = 1.0000** | Kd = exp(ΔG/RT): the *same variable* → keep ONE |
| Σ(6 contact categories) vs total contacts | **exact (diff 0.000)** | total is redundant with the six |
| ΔG regressed on contacts+NIS | **R² = 1.000** | ΔG is a **deterministic linear function** of the contact/NIS inputs (PRODIGY's formula) |
| ΔG vs total contacts | r = **−0.99** | affinity is almost entirely interface-size driven |

**Implication:** every PRODIGY number collapses onto **essentially one axis** — interface size → ΔG. ΔG already *integrates* the contacts and NIS. Stacking ΔG + Kd + contacts + categories would multiply-count one signal.

### Group A vs B
| Feature | A median | B median | MWU p | direction |
|---|---|---|---|---|
| ΔG | −14.9 | −12.2 | 0.011 | **A stronger** |
| log Kd | −10.9 | −8.9 | 0.011 | **A stronger** |
| Intermolecular contacts | 132 | 109 | 0.025 | A larger interface |
| % apolar NIS | 35.9 | 38.3 | <0.001 | B higher |
| % charged NIS | 26.1 | 27.8 | 0.018 | B higher |

- **PRODIGY favours Group A** (stronger predicted affinity) — *opposite* to AFS. Good: the layers capture different biology.
- ⚠️ **Caveat:** ΔG is size-driven (r −0.99 with contacts) and Group A here contains large ECM proteins (FN1, THBS1) → the A>B affinity edge may be partly an **interface-size artifact**, not genuine affinity. Do not over-claim.

---

## 2. How PRODIGY should become an independent score

1. **Use ΔG as the single PRODIGY affinity feature** (it already subsumes Kd, contacts, NIS). Drop Kd (identical), and do **not** add contacts/categories as independent score inputs — keep them as raw QC/provenance only.
2. **Outlier-robust normalization:** winsorize ΔG to e.g. [1st, 99th] percentile (tames the −69 artifact), then min-max invert (more negative ΔG → higher PS). Rank-based normalization is an acceptable alternative and is fully outlier-proof.
3. **Optional size-decoupling (flag, don't auto-apply):** because ΔG≈f(interface size), consider reporting ΔG *and* a size-controlled variant (e.g. ΔG per residue/contact) so a large protein isn't rewarded purely for being large. Decide during integration.
4. **Missing = NA**, propagate to integration (do not impute 0/mean); 49 pairs (mostly AF3) will need PRODIGY re-run or explicit NA handling.
5. **PRODIGY Score (PS) = robust-normalized, inverted, winsorized ΔG ∈ [0,1].** One number, independent of AFS/STRING.

---

## 3. STRING — DATA NOT PRESENT (analysis blocked)

**There is no STRING data anywhere on disk** (no STRING file; PRODIGY INFO has no STRING columns). I cannot analyze STRING distributions/missingness/redundancy until it is collected. Recommendation is therefore *methodological* (from project context §20–23):

- **Collect per pair:** combined score + the evidence channels (coexpression, experimental/biochemical, databases, textmining). STRING scores are already bounded 0–1 (or 0–1000) → min-max or /1000; **no log needed**.
- **Absence = "NA / no evidence", NEVER 0** (§22) — a strong-computational/no-STRING pair is a *novel candidate*, not a negative.
- **Preserve provenance:** a combined score driven by *experimental* evidence outranks one driven by *textmining*. STRING Score should not be the bare combined score; weight/annotate by channel.
- **αvβ3 special case (target 6):** query candidate→ITGAV and candidate→ITGB3 separately; derived feature = max(subunit scores), but retain both raw (§23).
- **STRING Score (SS) = normalized combined score + channel provenance**, computed independently of AFS/PS.

---

## 4. Three independent scores — summary

| Layer | Effective dimensionality | Score recipe | Missing policy |
|---|---|---|---|
| **AFS** | 4 features (ipTM-led) | done: weighted normalized (0.50/0.20/0.15/0.15) | complete (200/200) |
| **PS (PRODIGY)** | **1** (ΔG subsumes rest) | winsorized + robust-inverted ΔG → [0,1] | 49 NA (keep NA) |
| **SS (STRING)** | TBD (needs data) | normalized combined score + provenance | absence = NA, not 0 |

Each score is computed from its own raw source only; they meet **only** at the final TPS integration. **Next hard dependency: collect STRING data** before SS/TPS can exist.
