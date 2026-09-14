"""
Final PRODIGY Score (PS) — EXO-RANK. Independent module, read-only inputs.
PS = winsorized(1-99%) min-max of ΔG, inverted (more negative ΔG -> higher PS).
Intermolecular contacts + size-controlled ΔG/contact are carried as DESCRIPTORS only
(NOT in the score). Missing PRODIGY stays NA (never 0). Writes a NEW file.

Run: python scoring/prodigy_score.py
"""
import numpy as np, pandas as pd

P = pd.read_excel("outputs/PRODIGY INFO.xlsx")
dG = pd.read_excel("outputs/prodig_v1_parsed.xlsx").rename(
    columns={"Target No": "Target No.", "ΔG (kcal/mol)": "dG"})
df = P.merge(dG[["Target No.", "Group", "dG"]], on=["Target No.", "Group"], how="left")
df["contacts"] = pd.to_numeric(df["Intermolecular contacts"], errors="coerce")
df["dG"] = pd.to_numeric(df["dG"], errors="coerce")
df["Group_AB"] = np.where(df.Group <= 5, "A", "B")

valid = df["dG"].notna() & df["contacts"].notna()
n_valid = int(valid.sum())

# --- score: winsorized(1-99) min-max of dG, inverted (more negative -> 1) ---
p1, p99 = np.percentile(df.loc[valid, "dG"], [1, 99])
clipped = df["dG"].clip(p1, p99)
df["PRODIGY_Score"] = 1 - (clipped - p1) / (p99 - p1)      # NaN stays NaN
df.loc[~valid, "PRODIGY_Score"] = np.nan

# --- descriptors (NOT in score) ---
df["dG_per_contact"] = df["dG"] / df["contacts"]           # size-controlled diagnostic

out = df[["Target No.", "Receptor", "Group", "Protein", "Group_AB",
          "dG", "contacts", "dG_per_contact", "PRODIGY_Score"]].rename(
          columns={"dG": "dG_kcal_mol", "contacts": "intermolecular_contacts"})
out = out.sort_values(["Target No.", "Group"]).reset_index(drop=True)
out.to_csv("outputs/prodigy_score.csv", index=False)

assert out["PRODIGY_Score"].dropna().between(0, 1).all()
print(f"Wrote outputs/prodigy_score.csv ({len(out)} rows; PS valid={n_valid}, "
      f"NA={len(out)-n_valid} kept as NA)")
print(f"Winsorization bounds (1/99 pct of ΔG): {p1:.2f} / {p99:.2f} kcal/mol")
print(f"PS range: {out.PRODIGY_Score.min():.3f} - {out.PRODIGY_Score.max():.3f}")
print("\nTop 10 by PRODIGY_Score (ΔG-based):")
print(out.dropna(subset=["PRODIGY_Score"]).nlargest(10, "PRODIGY_Score")
      [["Target No.","Group","Receptor","Protein","Group_AB",
        "dG_kcal_mol","intermolecular_contacts","PRODIGY_Score"]].to_string(index=False))
