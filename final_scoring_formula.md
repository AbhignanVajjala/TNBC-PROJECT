# Final Scoring Formula — EXO-RANK TNBC (one page)

**Inputs (all 0–1):** AFS (structure), PS (winsorized ΔG), SS (STRING combined). BS = ligand surface-feasibility flag.

```
Per pair, S = available sources ⊆ {AFS, PS, SS}, equal weight w = 1/3:

    TPS      = ( Σ_{i∈S} score_i ) / |S|        # mean of available 0–1 scores
    coverage = |S|                              # 1, 2, or 3
    BS_flag  = High (≥0.7) | Medium (0.3–0.7) | Low (<0.3)   # per candidate ligand

Ranking      : sort by TPS (desc); ties → higher coverage, then higher AFS
Shortlist    : coverage ≥ 2  AND  BS_flag ≠ Low
```

**Rules**
- Missing PS/SS → excluded from that pair's mean (never 0, never median). Coverage flags it.
- SS = STRING combined score, used directly (calibrated 0–1; no min-max).
- BS is a **flag, not a term** (empirically circular with Group A/B, Cliff d = +0.98).
- Weights = equal, provisional; robust to reweighting (Spearman ρ 0.88–0.98). Not "validated."
- No ML (no labels). No ExoCarta/TNBC/EV-presence in BS (circular).

**A high TPS means:** independent computational lines (structure + energetics + prior evidence) converge on this pair as worth validating first — **not** that it binds.
