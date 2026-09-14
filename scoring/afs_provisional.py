"""
Provisional AlphaFold Score (AFS) — EXO-RANK, independent module.
Weights (literature-informed provisional, per user): ipTM .50, pTM .20,
interface PAE .15, mean pLDDT .15. Reads normalized AF features + interface PAE;
normalizes interface PAE globally (min-max, inverted: lower PAE = better).
Writes a NEW file. Modifies nothing existing. No PRODIGY/STRING here.

Run: python scoring/afs_provisional.py
"""
import pandas as pd

W = {"ipTM_N": 0.50, "pTM_N": 0.20, "interface_PAE_N": 0.15, "mean_pLDDT_N": 0.15}
assert abs(sum(W.values()) - 1) < 1e-9

norm = pd.read_csv("outputs/alphafold_normalized.csv")
ipae = pd.read_csv("outputs/interface_pae.csv")[["Target No.", "Group", "interface_PAE"]]

df = norm.merge(ipae, on=["Target No.", "Group"], how="left")
assert df["interface_PAE"].notna().all(), "interface PAE missing for some pair"

# global min-max, inverted (lower interface PAE = better -> higher score)
lo, hi = df["interface_PAE"].min(), df["interface_PAE"].max()
df["interface_PAE_N"] = 1 - (df["interface_PAE"] - lo) / (hi - lo)

df["AFS_provisional"] = sum(w * df[c] for c, w in W.items())
assert df["AFS_provisional"].between(0, 1).all()

df["Group_AB"] = df["Group"].apply(lambda g: "A" if g <= 5 else "B")
out = df[["Target No.", "Receptor", "Group", "Protein", "Group_AB",
          "ipTM_N", "pTM_N", "interface_PAE_N", "mean_pLDDT_N", "AFS_provisional"]]
out.sort_values("AFS_provisional", ascending=False).to_csv("outputs/afs_provisional.csv", index=False)

print(f"AFS provisional written: outputs/afs_provisional.csv ({len(out)} pairs)")
print(f"interface_PAE global min/max used: {lo:.3f} / {hi:.3f}")
print(f"AFS range: {out.AFS_provisional.min():.3f} - {out.AFS_provisional.max():.3f}")
print("\nTop 12 by provisional AFS:")
for _, r in out.head(12).iterrows():
    print(f"  T{int(r['Target No.'])}G{int(r['Group']):<2d}[{r.Group_AB}] "
          f"{str(r.Receptor)[:22]:22s} ~{r.Protein:9.9s} AFS={r.AFS_provisional:.3f}")
print("\nGroup A vs B mean AFS:", out.groupby("Group_AB").AFS_provisional.mean().round(3).to_dict())
