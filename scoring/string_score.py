"""
Final STRING Score (SS) — EXO-RANK, project-specific Biological Evidence Score.
SS = 0.40*Experimental + 0.25*Database + 0.20*PubMed + 0.15*CoExpression
using the numerical STRING channel scores parsed from the text cells.
STRING combined score is KEPT AS A REFERENCE/QC column (NOT a component of SS)
to avoid double-counting (combined already integrates the channels, r=0.99).
Missing STRING result -> NA (never 0). Read-only inputs; writes NEW files.

WEIGHTS are a PROVISIONAL methodological choice (evidence-quality hierarchy),
NOT literature-validated. See string_weight_sensitivity output.

Run: python scoring/string_score.py
"""
import re, numpy as np, pandas as pd

# evidence-quality hierarchy weights (provisional; sum=1)
WEIGHTS = {"experimental": 0.40, "database": 0.25, "textmining": 0.20, "coexpression": 0.15}
CH = {"Experimental/Biochemical Data": "experimental",
      "Association in Curated Databases": "database",
      "Co-Mentioned in Pubmed Abstracts": "textmining",
      "Co-Expression": "coexpression"}

def firstscore(v):
    """Numerical STRING score for a channel: first 'score X' in the cell,
    0 if 'none/insignificant' with no number, NaN if the cell is blank.
    (Note: for 'none, but homologs (score X)' this captures the homolog-transfer value.)"""
    if pd.isna(v):
        return np.nan
    m = re.search(r"score\s*([0-9.]+)", str(v))
    return float(m.group(1)) if m else 0.0

df = pd.read_excel("STRING INFO.xlsx")
for col, s in CH.items():
    df[s] = df[col].apply(firstscore)
df["STRING_combined"] = df["Combined Score"]            # reference/QC only
df["has_string_evidence"] = df["STRING_combined"].notna()

# SS = weighted channel sum, ONLY where STRING returned a result (else NA)
ch = list(WEIGHTS)
filled = df[ch].fillna(0.0)                              # blank channel in a scored pair = 0
df["STRING_Score"] = sum(WEIGHTS[c] * filled[c] for c in ch)
df.loc[~df["has_string_evidence"], "STRING_Score"] = np.nan   # missing pair -> NA

def dominant(r):
    if not r["has_string_evidence"]:
        return np.nan
    v = {c: (0 if pd.isna(r[c]) else r[c]) for c in ch}
    return max(v, key=v.get)
df["dominant_channel"] = df.apply(dominant, axis=1)

out = df[["Target No.", "Receptor", "Group", "Protein",
          "experimental", "database", "textmining", "coexpression",
          "dominant_channel", "has_string_evidence",
          "STRING_combined", "STRING_Score"]].sort_values(
          ["Target No.", "Group", "Protein"]).reset_index(drop=True)
out.to_csv("outputs/string_score.csv", index=False)

n = int(df.has_string_evidence.sum())
assert out["STRING_Score"].dropna().between(0, 1).all()
print(f"Wrote outputs/string_score.csv  (SS = {WEIGHTS})")
print(f"  scored pairs={n}, NA={len(out)-n}")
print(f"  SS_custom range: {out.STRING_Score.min():.3f} - {out.STRING_Score.max():.3f} "
      f"(low in absolute terms: experimental/db are sparse)")
print(f"  corr(SS_custom, STRING_combined) Pearson="
      f"{df[df.has_string_evidence][['STRING_Score','STRING_combined']].corr().iloc[0,1]:.3f}")
