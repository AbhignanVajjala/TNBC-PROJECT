"""
STRING SS weight-sensitivity analysis (EXO-RANK). Read-only, no ML.
Do reasonable changes to the E/C/P/CoEx hierarchy materially change the ranking?
Same philosophy as the AlphaFold weight sweep. Writes outputs/string_weight_sensitivity.csv.

Run: python scoring/string_weight_sensitivity.py
"""
import re, numpy as np, pandas as pd
from scipy.stats import spearmanr, mannwhitneyu

CH = {"Experimental/Biochemical Data": "experimental",
      "Association in Curated Databases": "database",
      "Co-Mentioned in Pubmed Abstracts": "textmining",
      "Co-Expression": "coexpression"}
def firstscore(v):
    if pd.isna(v): return np.nan
    m = re.search(r"score\s*([0-9.]+)", str(v)); return float(m.group(1)) if m else 0.0

df = pd.read_excel("STRING INFO.xlsx")
for c, s in CH.items(): df[s] = df[c].apply(firstscore)
have = df[df["Combined Score"].notna()].copy()
for s in CH.values(): have[s] = have[s].fillna(0.0)
have["Group_AB"] = have["Group"]                       # already 'A'/'B'

# order: (experimental, database, textmining, coexpression)
SCHEMES = {
    "rec_40_25_20_15": (.40, .25, .20, .15),
    "usr_30_30_25_15": (.30, .30, .25, .15),
    "usr_50_20_20_10": (.50, .20, .20, .10),
    "exp_heavy_60_20_15_05": (.60, .20, .15, .05),
    "equal_25_25_25_25": (.25, .25, .25, .25),
    "text_lean_20_20_40_20": (.20, .20, .40, .20),
}
cols = ["experimental", "database", "textmining", "coexpression"]
for name, w in SCHEMES.items():
    have[name] = sum(w[i] * have[cols[i]] for i in range(4))
have["STRING_combined"] = have["Combined Score"]

print(f"Sensitivity over {len(have)} scored pairs.\n")
print("Spearman rank-correlation between schemes (and vs STRING_combined):")
keys = list(SCHEMES) + ["STRING_combined"]
for a in list(SCHEMES):
    row = "  %-22s" % a
    for b in keys:
        row += " %+.2f" % spearmanr(have[a], have[b]).correlation
    print(row)
print("  header:                ", " ".join("%5s" % k[:5] for k in keys))

print("\nTop-10 / Top-20 overlap vs recommended scheme:")
def top(col, k): return set(have.nlargest(k, col).index)
rec = "rec_40_25_20_15"
for name in keys:
    o10 = len(top(name, 10) & top(rec, 10)); o20 = len(top(name, 20) & top(rec, 20))
    print(f"  {name:22s} top10={o10}/10 top20={o20}/20")

# robust top candidates: in top-10 of ALL channel-based schemes
core = set.intersection(*[top(n, 10) for n in SCHEMES])
def lab(i):
    r = have.loc[i]; return f"T{int(r['Target No.'])}:{r['Receptor'][:14]}~{r['Protein']}"
print(f"\nRobust top-10 (in EVERY channel weighting) [{len(core)}]:", sorted(lab(i) for i in core))

print("\nGroup A vs B (recommended scheme):")
a = have[have.Group_AB == "A"][rec]; b = have[have.Group_AB == "B"][rec]
U, p = mannwhitneyu(a, b)
print(f"  A_med={a.median():.3f} B_med={b.median():.3f} MWU p={p:.3f} Cliff={2*U/(len(a)*len(b))-1:+.2f}")

have[["Target No.","Receptor","Group","Protein","STRING_combined"]+list(SCHEMES)].to_csv(
    "outputs/string_weight_sensitivity.csv", index=False)
print("\nWrote outputs/string_weight_sensitivity.csv")
