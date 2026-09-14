"""
PRODIGY feature analysis for EXO-RANK (read-only; no scores written, no ML).
Distributions, missing values, redundancy/correlation, Group A(1-5) vs B(6-10).
STRING is analyzed separately — no STRING data exists on disk yet.

Run: python scoring/prodigy_analysis.py
"""
import numpy as np
import pandas as pd
from scipy.stats import mannwhitneyu

P = pd.read_excel("outputs/PRODIGY INFO.xlsx")
dG = pd.read_excel("outputs/prodig_v1_parsed.xlsx").rename(
    columns={"Target No": "Target No.", "ΔG (kcal/mol)": "dG", "Kd (M)": "Kd_parsed"})
df = P.merge(dG[["Target No.", "Group", "dG", "Kd_parsed"]], on=["Target No.", "Group"], how="left")

CONTACT = ["Charged- charged contacts", "charged- polar contacts", "charged- apolar contacts",
           "polar- polar contacts", "apolar- polar contacts", "apolar- apolar contacts"]
NUM = ["Kd", "Intermolecular contacts",
       "NIS residues (% of apolar NIS residues)", "NIS residues (% of charged NIS residues)"] + CONTACT
for c in NUM:
    df[c] = pd.to_numeric(df[c], errors="coerce")   # 'N/A' -> NaN
df["logKd"] = np.log10(df["Kd"])
df["Group_AB"] = df["Group"].apply(lambda g: "A" if g <= 5 else "B")

print("=" * 70, "\nPRODIGY — MISSING VALUES\n" + "=" * 70)
n = len(df)
present = df["dG"].notna() & df["Intermolecular contacts"].notna()
print(f"rows={n} | with PRODIGY data={present.sum()} | missing={n-present.sum()}")
miss = df[~present]
print("missing by Group_AB:", miss.Group_AB.value_counts().to_dict())
print("(missing = AF3 pairs never run in PRODIGY-v1 + 3 'no contacts' errors)")

print("\n" + "=" * 70, "\nDISTRIBUTIONS\n" + "=" * 70)
feats = ["dG", "logKd", "Intermolecular contacts",
         "NIS residues (% of apolar NIS residues)", "NIS residues (% of charged NIS residues)"] + CONTACT
d = df[feats].describe().T
d["skew"] = df[feats].skew()
print(d[["count", "mean", "std", "skew", "min", "50%", "max"]].round(3).to_string())
print(f"\nKd raw spans {df.Kd.min():.1e} to {df.Kd.max():.1e}  -> log scale mandatory")

print("\n" + "=" * 70, "\nREDUNDANCY\n" + "=" * 70)
print(f"1) dG vs logKd Pearson r = {df[['dG','logKd']].corr().iloc[0,1]:.4f}  "
      f"(Kd = exp(dG/RT): mathematically identical -> keep ONE)")
csum = df[CONTACT].sum(axis=1)
print(f"2) sum(6 contact categories) == Intermolecular contacts? "
      f"max abs diff = {(csum - df['Intermolecular contacts']).abs().max():.3f}  -> total is redundant with the 6")
# dG is (by PRODIGY design) a linear function of contacts + NIS: check R^2
X = df[CONTACT + ["NIS residues (% of apolar NIS residues)",
                  "NIS residues (% of charged NIS residues)"]].copy()
m = df["dG"].notna() & X.notna().all(axis=1)
Xf = X[m].values; yf = df["dG"][m].values
Xa = np.column_stack([np.ones(len(Xf)), Xf])
beta, *_ = np.linalg.lstsq(Xa, yf, rcond=None)
pred = Xa @ beta
r2 = 1 - ((yf - pred)**2).sum() / ((yf - yf.mean())**2).sum()
print(f"3) dG regressed on contacts+NIS: R^2 = {r2:.3f}  "
      f"-> dG is (near-)deterministic function of the contact/NIS inputs")
print("\nPearson correlation among core PRODIGY features:")
core = ["dG", "logKd", "Intermolecular contacts",
        "NIS residues (% of apolar NIS residues)", "NIS residues (% of charged NIS residues)"]
print(df[core].corr().round(2).to_string())

print("\n" + "=" * 70, "\nGROUP A (1-5) vs GROUP B (6-10)\n" + "=" * 70)
for f in ["dG", "logKd", "Intermolecular contacts",
          "NIS residues (% of apolar NIS residues)", "NIS residues (% of charged NIS residues)"]:
    a = df[(df.Group_AB == "A")][f].dropna()
    b = df[(df.Group_AB == "B")][f].dropna()
    p = mannwhitneyu(a, b).pvalue
    print(f"  {f:45.45s} A med={a.median():8.2f}  B med={b.median():8.2f}  MWU p={p:.3f}")
