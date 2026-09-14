"""
FINAL TPS integration analysis — EXO-RANK. Read-only, no ML, no raw-file edits.
Empirically tests: source independence, missingness, BS-circularity, TPS + weight
sensitivity, coverage. Outputs source_correlation.csv, scoring_sensitivity.csv,
final_score_example.csv.
Run: python scoring/final_integration_analysis.py
"""
import numpy as np, pandas as pd
from scipy.stats import spearmanr, pearsonr, mannwhitneyu

afs = pd.read_csv("outputs/afs_provisional.csv")[["Target No.", "Group", "Protein", "Group_AB", "AFS_provisional"]]
ps  = pd.read_csv("outputs/prodigy_score.csv")[["Target No.", "Group", "Protein", "PRODIGY_Score"]]
ss  = pd.read_csv("outputs/string_score.csv")[["Target No.", "Protein", "STRING_combined"]]
df = afs.merge(ps, on=["Target No.", "Group", "Protein"], how="left") \
        .merge(ss, on=["Target No.", "Protein"], how="left")
df = df.rename(columns={"AFS_provisional": "AFS", "PRODIGY_Score": "PS", "STRING_combined": "SS"})

# ---------- BS prototype: literature-informed surface-presentation tier per candidate ----------
# (provisional; real build would pull UniProt loc/topology + CSPA + SURFY + Vesiclepedia)
BS_TIER = {  # transmembrane/surface
    "ITGB1": 0.90, "ITGA6": 0.90, "CD44": 0.90, "BSG": 0.90, "SLC3A2": 0.90,
    # secreted / ECM / EV-surface-binding
    "FN1": 0.85, "THBS1": 0.85, "MFGE8": 0.85, "LGALS3BP": 0.85,
    # peripheral / documented surface translocation
    "ANXA2": 0.60, "ENO1": 0.45, "SDCBP": 0.40, "HSP90AA1": 0.40, "GAPDH": 0.35,
    # cytosolic, minimal surface evidence
    "PKM": 0.30, "LDHA": 0.20, "ALDOA": 0.20, "PGK1": 0.20, "TPI1": 0.20,
    "EEF1A1": 0.20, "TKT": 0.20,
}
df["BS"] = df.Protein.map(BS_TIER)

print("=" * 66, "\nMISSINGNESS (of 200 pairs)")
for c in ["AFS", "PS", "SS", "BS"]:
    print(f"  {c}: present={df[c].notna().sum():3d}  missing={df[c].isna().sum():3d}")

print("=" * 66, "\nSOURCE CORRELATIONS (Spearman, pairwise complete)")
cor = df[["AFS", "PS", "SS", "BS"]].corr(method="spearman")
print(cor.round(3).to_string())
cor.to_csv("outputs/source_correlation.csv")

print("=" * 66, "\nBS CIRCULARITY TEST (does BS just reproduce Group A/B?)")
a = df[df.Group_AB == "A"].BS; b = df[df.Group_AB == "B"].BS
U, p = mannwhitneyu(a, b)
print(f"  BS: A_med={a.median():.2f} B_med={b.median():.2f} MWU p={p:.1e} Cliff={2*U/(len(a)*len(b))-1:+.2f}")
# but does BS DISAGREE with A/B for some? (non-circular evidence)
print("  Group B candidates with non-trivial BS (>0.3):", sorted(set(df[(df.Group_AB=='B')&(df.BS>0.3)].Protein)))
print("  Group A candidates with modest BS (<=0.6):     ", sorted(set(df[(df.Group_AB=='A')&(df.BS<=0.6)].Protein)))
print(f"  Spearman(BS, AFS)={spearmanr(*df[['BS','AFS']].dropna().values.T).correlation:+.3f} "
      f"(BS should NOT track AFS -> it corrects, not echoes)")

# ---------- TPS: available-source weighted mean (renormalized) + coverage ----------
def tps(row, w):
    src = {"AFS": row.AFS, "PS": row.PS, "SS": row.SS}
    avail = {k: v for k, v in src.items() if pd.notna(v)}
    if not avail: return np.nan, 0
    num = sum(w[k] * avail[k] for k in avail); den = sum(w[k] for k in avail)
    return num / den, len(avail)

SCHEMES = {  # (AFS, PS, SS)
    "equal":       {"AFS": 1/3, "PS": 1/3, "SS": 1/3},
    "afs_lean":    {"AFS": .50, "PS": .30, "SS": .20},
    "afs_heavy":   {"AFS": .60, "PS": .20, "SS": .20},
    "struct_lean": {"AFS": .40, "PS": .40, "SS": .20},
    "ss_up":       {"AFS": .40, "PS": .20, "SS": .40},
}
for name, w in SCHEMES.items():
    res = df.apply(lambda r: tps(r, w), axis=1)
    df[f"TPS_{name}"] = [x[0] for x in res]
    if name == "equal": df["coverage"] = [x[1] for x in res]

print("=" * 66, "\nWEIGHT SENSITIVITY (Spearman between schemes; top-10/20 overlap vs equal)")
names = list(SCHEMES)
for n in names:
    rho = spearmanr(df["TPS_equal"], df[f"TPS_{n}"], nan_policy="omit").correlation
    t10 = len(set(df.nlargest(10, "TPS_equal").index) & set(df.nlargest(10, f"TPS_{n}").index))
    t20 = len(set(df.nlargest(20, "TPS_equal").index) & set(df.nlargest(20, f"TPS_{n}").index))
    print(f"  {n:11s} rho_vs_equal={rho:.3f} top10={t10}/10 top20={t20}/20")

# robust top: top-20 under every scheme
robust = set.intersection(*[set(df.nlargest(20, f"TPS_{n}").index) for n in names])
print(f"\nRobust top (in top-20 of ALL weightings) [{len(robust)}]:")
for i in sorted(robust, key=lambda i: -df.loc[i, "TPS_equal"]):
    r = df.loc[i]
    print(f"  T{int(r['Target No.'])}G{int(r.Group):<2d}[{r.Group_AB}] {str(r.Receptor if 'Receptor' in r else '')[:0]}"
          f"{r.Protein:9.9s} TPS={r.TPS_equal:.3f} cov={int(r.coverage)} BS={r.BS:.2f}")

print("=" * 66, "\nCOVERAGE distribution:", df.coverage.value_counts().sort_index().to_dict())

df.to_csv("outputs/scoring_sensitivity.csv", index=False)
# tidy example file
ex = df[["Target No.","Group","Group_AB","Protein","AFS","PS","SS","coverage","BS","TPS_equal"]].copy()
ex["rank_equal"] = ex["TPS_equal"].rank(ascending=False, method="min")
ex.sort_values("TPS_equal", ascending=False).to_csv("outputs/final_score_example.csv", index=False)
print("\nWrote source_correlation.csv, scoring_sensitivity.csv, final_score_example.csv")
