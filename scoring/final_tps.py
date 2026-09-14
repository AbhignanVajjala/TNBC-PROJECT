"""
FINAL TPS implementation — EXO-RANK (locked methodology). Read-only inputs; no ML.
TPS = mean of available {AFS, PS, SS} (equal weights, renormalized). Coverage = n/3.
BS = feasibility FLAG, currently PENDING (not yet computed from UniProt/CSPA/SURFY/
Vesiclepedia) -> not invented. Shortlist: coverage>=2/3 (BS=Low exclusion pending BS build).
Outputs: final_score_calculation.csv, scoring_sensitivity.csv, source_correlation.csv.
Run: python scoring/final_tps.py
"""
import numpy as np, pandas as pd
from scipy.stats import spearmanr, mannwhitneyu

afs = pd.read_csv("outputs/afs_provisional.csv")[
    ["Target No.", "Receptor", "Group", "Protein", "Group_AB", "AFS_provisional"]]
ps  = pd.read_csv("outputs/prodigy_score.csv")[["Target No.", "Group", "Protein", "PRODIGY_Score"]]
ss  = pd.read_csv("outputs/string_score.csv")[["Target No.", "Protein", "STRING_combined"]]
df = (afs.merge(ps, on=["Target No.", "Group", "Protein"], how="left")
         .merge(ss, on=["Target No.", "Protein"], how="left")
         .rename(columns={"AFS_provisional": "AFS", "PRODIGY_Score": "PS", "STRING_combined": "SS"}))

SRC = ["AFS", "PS", "SS"]
def tps_cov(row, w):
    avail = [(s, row[s]) for s in SRC if pd.notna(row[s])]
    if not avail: return np.nan, 0
    num = sum(w[s] * v for s, v in avail); den = sum(w[s] for s, _ in avail)
    return num / den, len(avail)

EQUAL = {"AFS": 1/3, "PS": 1/3, "SS": 1/3}
df["TPS"], df["n_sources"] = zip(*df.apply(lambda r: tps_cov(r, EQUAL), axis=1))
df["Coverage"] = df["n_sources"].map({1: "1/3", 2: "2/3", 3: "3/3"})
df["BS_flag"] = "Pending"                       # not computed from real sources yet
df["Rank"] = df["TPS"].rank(ascending=False, method="min").astype(int)

# shortlist rule: coverage >= 2/3  (BS=Low exclusion pending BS build)
df["In_shortlist"] = df["n_sources"] >= 2
df["Exclusion_reason"] = np.where(df["n_sources"] >= 2, "",
                                  "coverage 1/3 (AFS-only) < 2/3 threshold")

out = df[["Target No.", "Receptor", "Group", "Group_AB", "Protein",
          "AFS", "PS", "SS", "Coverage", "BS_flag", "TPS", "Rank",
          "In_shortlist", "Exclusion_reason"]].sort_values("TPS", ascending=False)
out.to_csv("outputs/final_score_calculation.csv", index=False)

# ---- source correlation (distinct evidence dimensions; low STRING vs AF/PS) ----
df[SRC].corr(method="spearman").round(3).to_csv("outputs/source_correlation.csv")

# ---- weight sensitivity ----
SCHEMES = {"equal_.33/.33/.33": (1/3,1/3,1/3), "0.50/0.30/0.20": (.50,.30,.20),
           "0.50/0.20/0.30": (.50,.20,.30), "0.40/0.35/0.25": (.40,.35,.25),
           "0.40/0.30/0.30": (.40,.30,.30)}
S = pd.DataFrame({"Target No.": df["Target No."], "Protein": df["Protein"]})
for name, (a, b, c) in SCHEMES.items():
    w = {"AFS": a, "PS": b, "SS": c}
    S[name] = df.apply(lambda r: tps_cov(r, w)[0], axis=1)
S.to_csv("outputs/scoring_sensitivity.csv", index=False)

print("=== TPS summary ===")
print(f"pairs={len(df)} | coverage 3/3={sum(df.n_sources==3)} 2/3={sum(df.n_sources==2)} 1/3={sum(df.n_sources==1)}")
print(f"shortlist (coverage>=2/3): {df.In_shortlist.sum()} pairs")
print(f"TPS range: {df.TPS.min():.3f} - {df.TPS.max():.3f}")

print("\n=== Weight sensitivity (vs equal) ===")
eq = S["equal_.33/.33/.33"]
for name in SCHEMES:
    rho = spearmanr(eq, S[name]).correlation
    t10 = len(set(S.nlargest(10, "equal_.33/.33/.33").index) & set(S.nlargest(10, name).index))
    t20 = len(set(S.nlargest(20, "equal_.33/.33/.33").index) & set(S.nlargest(20, name).index))
    print(f"  {name:18s} rho={rho:.3f} top10={t10}/10 top20={t20}/20")
# weight-sensitive candidates: largest rank swing across schemes
ranks = S[list(SCHEMES)].rank(ascending=False, method="min")
swing = (ranks.max(axis=1) - ranks.min(axis=1))
worst = swing.nlargest(6)
print("  most weight-sensitive pairs (rank swing):")
for i in worst.index:
    print(f"    {df.loc[i,'Protein']:9s} @T{int(df.loc[i,'Target No.'])} "
          f"rank {int(ranks.loc[i].min())}-{int(ranks.loc[i].max())} (swing {int(worst[i])})")

print("\n=== Group A/B sanity (TPS; NOT a training label) ===")
a = df[df.Group_AB == "A"].TPS.dropna(); b = df[df.Group_AB == "B"].TPS.dropna()
U, p = mannwhitneyu(a, b)
print(f"  A: mean={a.mean():.3f} median={a.median():.3f} | B: mean={b.mean():.3f} median={b.median():.3f}")
print(f"  MWU p={p:.3f}  Cliff's d={2*U/(len(a)*len(b))-1:+.2f}  "
      f"({'A>B' if a.median()>b.median() else 'B>A'} — supportive/neutral sanity check only)")

print("\n=== Top 12 by TPS (shortlist) ===")
sl = out[out.In_shortlist].head(12)
for _, r in sl.iterrows():
    print(f"  #{r.Rank:<3d} T{int(r['Target No.'])} {str(r.Receptor)[:16]:16s} ~{r.Protein:9.9s} "
          f"[{r.Group_AB}] TPS={r.TPS:.3f} cov={r.Coverage}")
print("\nWrote final_score_calculation.csv, scoring_sensitivity.csv, source_correlation.csv")
