"""
AlphaFold Score (AFS) weight analysis — EXO-RANK (independent module).
Steps 1,3,4,5,6 of the weighting task. NO coefficients are declared final here;
NO supervised ML; Group A/B is NEVER used as a label. Reads normalized CSV only.

Inputs : outputs/alphafold_normalized.csv  (read-only)
Outputs: outputs/af_weight_schemes.csv
         outputs/af_sensitivity_analysis.csv
         outputs/af_rank_stability.csv

Run: python scoring/af_weight_analysis.py
"""
import itertools
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, pearsonr

IN = "outputs/alphafold_normalized.csv"
FEATS = ["ipTM_N", "pTM_N", "median_PAE_N", "mean_pLDDT_N"]      # order: ipTM,pTM,PAE,pLDDT
KEY = ["Target No.", "Receptor", "Group", "Protein"]

# ---- candidate schemes (Step 3): all >=0, sum=1, ipTM >= pTM, ipTM dominant/co-dominant
SCHEMES = {  # name: (w_ipTM, w_pTM, w_PAE, w_pLDDT)
    "A_hypothesis":  (0.50, 0.20, 0.15, 0.15),
    "B_balanced":    (0.40, 0.25, 0.20, 0.15),
    "C_interface":   (0.60, 0.20, 0.10, 0.10),
    "D_PAE_aware":   (0.45, 0.25, 0.20, 0.10),
    "E_AFmultimer":  (0.80, 0.20, 0.00, 0.00),   # literal AlphaFold-Multimer ranking confidence
}


def afs(df, w):
    return (w[0]*df["ipTM_N"] + w[1]*df["pTM_N"]
            + w[2]*df["median_PAE_N"] + w[3]*df["mean_pLDDT_N"])


def step1_describe(df):
    print("=" * 70, "\nSTEP 1 — DESCRIPTIVE STATS & CORRELATIONS\n" + "=" * 70)
    desc = df[FEATS].describe().T
    desc["variance"] = df[FEATS].var()
    desc["skew"] = df[FEATS].skew()
    print("\nDescriptive statistics (normalized features):")
    print(desc[["mean", "std", "variance", "skew", "min", "25%", "50%", "75%", "max"]].round(3))

    print("\nPearson correlation:")
    print(df[FEATS].corr(method="pearson").round(2))
    print("\nSpearman correlation:")
    print(df[FEATS].corr(method="spearman").round(2))

    print("\nRedundancy flags (|Pearson r| > 0.85 among retained features):")
    P = df[FEATS].corr().abs()
    flagged = [(a, b, round(P.loc[a, b], 2)) for i, a in enumerate(FEATS)
               for b in FEATS[i+1:] if P.loc[a, b] > 0.85]
    print("  ", flagged if flagged else "none — all four retained features are non-redundant")
    lowvar = [f for f in FEATS if df[f].var() < 0.01]
    print("Low-variance flags (var<0.01):", lowvar if lowvar else "none")
    return desc


def main():
    df = pd.read_csv(IN)
    n = len(df)
    step1_describe(df)

    # ---- Step 4: AFS per scheme
    out = df[KEY + FEATS].copy()
    for name, w in SCHEMES.items():
        assert abs(sum(w) - 1) < 1e-9 and all(x >= 0 for x in w) and w[0] >= w[1], name
        out[f"AFS_{name}"] = afs(df, w)
    out.to_csv("outputs/af_weight_schemes.csv", index=False)

    # ---- Step 5: sensitivity across the 5 named schemes
    ranks = pd.DataFrame(index=df.index)
    for name in SCHEMES:
        ranks[name] = out[f"AFS_{name}"].rank(ascending=False, method="min").astype(int)

    print("\n" + "=" * 70, "\nSTEP 5 — SENSITIVITY (5 named schemes)\n" + "=" * 70)
    print("\nSpearman rank correlation between schemes:")
    rho = pd.DataFrame(index=SCHEMES, columns=SCHEMES, dtype=float)
    for a in SCHEMES:
        for b in SCHEMES:
            rho.loc[a, b] = spearmanr(ranks[a], ranks[b]).correlation
    print(rho.astype(float).round(3))

    def label(i):
        r = df.loc[i]
        return f"T{int(r['Target No.'])}G{int(r['Group'])}:{r['Receptor']}~{r['Protein']}"

    top10 = {name: set(ranks[name].nsmallest(10).index) for name in SCHEMES}
    top20 = {name: set(ranks[name].nsmallest(20).index) for name in SCHEMES}
    print("\nTop-10 overlap (Jaccard) between schemes:")
    J = pd.DataFrame(index=SCHEMES, columns=SCHEMES, dtype=float)
    for a in SCHEMES:
        for b in SCHEMES:
            J.loc[a, b] = len(top10[a] & top10[b]) / len(top10[a] | top10[b])
    print(J.astype(float).round(2))

    core10 = set.intersection(*top10.values())
    core20 = set.intersection(*top20.values())
    print(f"\nStable core — in EVERY scheme's top-10 ({len(core10)}): ",
          sorted(label(i) for i in core10))
    print(f"Stable core — in EVERY scheme's top-20 ({len(core20)}): ",
          sorted(label(i) for i in core20))

    sens = df[KEY].copy()
    for name in SCHEMES:
        sens[f"rank_{name}"] = ranks[name]
    sens["rank_min"] = ranks.min(axis=1)
    sens["rank_max"] = ranks.max(axis=1)
    sens["rank_range"] = ranks.max(axis=1) - ranks.min(axis=1)
    sens["rank_median"] = ranks.median(axis=1)
    sens["in_top10_count"] = sum((ranks[n] <= 10).astype(int) for n in SCHEMES)
    sens["in_top20_count"] = sum((ranks[n] <= 20).astype(int) for n in SCHEMES)
    sens.sort_values("rank_median").to_csv("outputs/af_sensitivity_analysis.csv", index=False)

    # most volatile among reasonably-ranked pairs
    vol = sens[sens["rank_min"] <= 40].sort_values("rank_range", ascending=False).head(8)
    print("\nMost weight-sensitive candidates (rank_min<=40, largest rank swing):")
    for _, r in vol.iterrows():
        print(f"  T{int(r['Target No.'])}G{int(r['Group'])} {r['Receptor']}~{r['Protein']}: "
              f"rank {int(r['rank_min'])}-{int(r['rank_max'])} (swing {int(r['rank_range'])})")

    # ---- Step 6: systematic weight sweep (grid, step 0.05)
    print("\n" + "=" * 70, "\nSTEP 6 — WEIGHT SWEEP\n" + "=" * 70)
    step = 0.05
    grid = []
    for a, b, c in itertools.product(range(21), repeat=3):
        d = 20 - a - b - c
        if d < 0:
            continue
        w = (a*step, b*step, c*step, d*step)
        # ipTM dominant/co-dominant + not < any other; ipTM>=0.35; avoid PAE/pLDDT dominance
        if w[0] < 0.35 - 1e-9:
            continue
        if w[0] < max(w[1], w[2], w[3]) - 1e-9:
            continue
        grid.append(w)
    print(f"Valid weight vectors in sweep (ipTM>=0.35 and ipTM>=all others): {len(grid)}")

    M = np.column_stack([df[f].values for f in FEATS])  # n x 4
    W = np.array(grid)                                   # g x 4
    AFS_all = M @ W.T                                    # n x g
    # rank per column (1=best); use argsort of -AFS
    order = np.argsort(-AFS_all, axis=0)
    ranks_sweep = np.empty_like(order)
    rows = np.arange(len(df))[:, None]
    ranks_sweep[order, np.arange(len(grid))] = rows + 1   # rank 1..n
    top10_freq = (ranks_sweep <= 10).mean(axis=1)
    top20_freq = (ranks_sweep <= 20).mean(axis=1)
    med_rank = np.median(ranks_sweep, axis=1)
    rank_lo = ranks_sweep.min(axis=1)
    rank_hi = ranks_sweep.max(axis=1)

    stab = df[KEY].copy()
    stab["top10_freq"] = top10_freq.round(3)
    stab["top20_freq"] = top20_freq.round(3)
    stab["median_rank"] = med_rank.astype(int)
    stab["rank_min"] = rank_lo
    stab["rank_max"] = rank_hi
    stab["rank_range"] = rank_hi - rank_lo
    stab = stab.sort_values(["top20_freq", "median_rank"], ascending=[False, True])
    stab.to_csv("outputs/af_rank_stability.csv", index=False)

    print(f"\nAcross {len(grid)} plausible weightings, 'robustly high-ranking' pairs")
    print("(top20_freq = fraction of weightings placing the pair in the top 20):\n")
    show = stab.head(15)
    for _, r in show.iterrows():
        print(f"  T{int(r['Target No.'])}G{int(r['Group']):<2d} {r['Receptor']:<16.16s}~{r['Protein']:<10.10s} "
              f"top20={r['top20_freq']:.2f} top10={r['top10_freq']:.2f} "
              f"medRank={int(r['median_rank']):3d} range[{int(r['rank_min'])}-{int(r['rank_max'])}]")

    print("\nWrote: outputs/af_weight_schemes.csv, outputs/af_sensitivity_analysis.csv, "
          "outputs/af_rank_stability.csv")
    print("Raw AlphaFold spreadsheet and alphafold_normalized.csv: NOT modified.")


if __name__ == "__main__":
    main()
