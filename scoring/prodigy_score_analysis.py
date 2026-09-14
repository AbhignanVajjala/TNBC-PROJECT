"""
PRODIGY Score (PS) feature/weight analysis — EXO-RANK. Read-only, no ML, no STRING.
Two-feature question: PS = w1*dG_norm + w2*Contact_norm. Is 70:30 defensible?

Run: python scoring/prodigy_score_analysis.py
"""
import numpy as np, pandas as pd
from scipy.stats import pearsonr, spearmanr, mannwhitneyu

P = pd.read_excel("outputs/PRODIGY INFO.xlsx")
dG = pd.read_excel("outputs/prodig_v1_parsed.xlsx").rename(
    columns={"Target No": "Target No.", "ΔG (kcal/mol)": "dG", "Kd (M)": "Kd"})
df = P.merge(dG[["Target No.", "Group", "dG", "Kd"]], on=["Target No.", "Group"], how="left")
CONTACT_CATS = ["Charged- charged contacts","charged- polar contacts","charged- apolar contacts",
                "polar- polar contacts","apolar- polar contacts","apolar- apolar contacts"]
for c in ["Intermolecular contacts","NIS residues (% of apolar NIS residues)",
          "NIS residues (% of charged NIS residues)"]+CONTACT_CATS:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df["Group_AB"] = np.where(df.Group <= 5, "A", "B")
d = df.dropna(subset=["dG","Intermolecular contacts"]).copy()   # 151 complete
d = d.rename(columns={"Intermolecular contacts":"contacts",
                      "NIS residues (% of apolar NIS residues)":"NIS_apolar",
                      "NIS residues (% of charged NIS residues)":"NIS_charged"})
d["NIS_total"] = d.NIS_apolar + d.NIS_charged
print(f"Complete PRODIGY pairs: {len(d)}  (A={sum(d.Group_AB=='A')}, B={sum(d.Group_AB=='B')})")

# ---------------- PART 2: distributions ----------------
print("\n== PART 2A/B  distributions ==")
for col in ["dG","contacts"]:
    s=d[col]; print(f"{col:9s} min={s.min():.2f} max={s.max():.2f} mean={s.mean():.2f} "
                     f"median={s.median():.2f} SD={s.std():.2f} skew={s.skew():.2f}")
print("dG extreme tail (most negative 5):", sorted(d.dG)[:5])
print("contacts extreme (largest 5):", sorted(d.contacts)[-5:])

print("\n== PART 2C  independence ==")
pr,_=pearsonr(d.dG,d.contacts); sp,_=spearmanr(d.dG,d.contacts)
r2=np.corrcoef(d.dG,d.contacts)[0,1]**2
print(f"dG vs contacts : Pearson={pr:.3f}  Spearman={sp:.3f}  R^2={r2:.3f}")
print(f"dG vs NIS_total: Pearson={pearsonr(d.dG,d.NIS_total)[0]:.3f}")
print(f"contacts vs NIS_total: Pearson={pearsonr(d.contacts,d.NIS_total)[0]:.3f}")
# dG reconstructed from contact categories + NIS (PRODIGY is linear in these)
X=np.column_stack([np.ones(len(d))]+[d[c] for c in CONTACT_CATS]+[d.NIS_apolar,d.NIS_charged])
beta,*_=np.linalg.lstsq(X,d.dG.values,rcond=None); pred=X@beta
R2_full=1-((d.dG-pred)**2).sum()/((d.dG-d.dG.mean())**2).sum()
print(f"dG reconstructed from 6 contact cats + 2 NIS: R^2={R2_full:.4f} (PRODIGY's own linear model)")

# ---------------- PART 6: normalization options ----------------
def mm(x, invert):           # min-max
    z=(x-x.min())/(x.max()-x.min()); return 1-z if invert else z
def wmm(x, invert, lo=1, hi=99):   # winsorized min-max
    a,b=np.percentile(x,[lo,hi]); xc=np.clip(x,a,b); z=(xc-a)/(b-a); return 1-z if invert else z
def rankn(x, invert):        # percentile/rank
    r=pd.Series(x).rank(pct=True).values; return 1-r if invert else r
print("\n== PART 6  normalization of dG (extreme tail sensitivity) ==")
for name,fn in [("minmax",mm),("winsor1-99",wmm),("rank",rankn)]:
    dgn=fn(d.dG.values,True)
    # how compressed is the bulk? show value at the 2nd-best vs best
    print(f"  dG_{name:11s}: top score={dgn.max():.3f}, 2nd={sorted(dgn)[-2]:.3f}, "
          f"median={np.median(dgn):.3f}  (min-max squashed if 2nd<<1)")

# choose winsorized min-max as primary (robust to the -69 tail); report all
NORM = "winsor"
def norm(x, invert):
    return {"minmax":mm,"winsor":wmm,"rank":rankn}[NORM](np.asarray(x,float),invert)
d["dG_norm"]=norm(d.dG,True)          # more negative -> higher
d["Contact_norm"]=norm(d.contacts,False)

# ---------------- PART 3: weight schemes + ranking robustness ----------------
SCHEMES={"dG_only":(1.0,0.0),"90:10":(0.9,0.1),"80:20":(0.8,0.2),"70:30":(0.7,0.3),
         "60:40":(0.6,0.4),"50:50":(0.5,0.5),"contact_only":(0.0,1.0)}
for name,(w1,w2) in SCHEMES.items():
    d[f"PS_{name}"]=w1*d.dG_norm+w2*d.Contact_norm
print("\n== PART 3  ranking robustness across weightings ==")
names=list(SCHEMES); print("Spearman rank-corr between schemes (vs dG_only and vs 70:30):")
for n in names:
    rho_dg=spearmanr(d.PS_dG_only,d[f"PS_{n}"]).correlation
    rho_70=spearmanr(d["PS_70:30"],d[f"PS_{n}"]).correlation
    print(f"  {n:12s} vs dG_only={rho_dg:.3f}   vs 70:30={rho_70:.3f}")
def topset(col,k): return set(d.nlargest(k,col).index)
print("Top-10 / Top-20 overlap with dG_only:")
for n in names:
    o10=len(topset(f"PS_{n}",10)&topset("PS_dG_only",10))
    o20=len(topset(f"PS_{n}",20)&topset("PS_dG_only",20))
    print(f"  {n:12s} top10={o10}/10  top20={o20}/20")

# ---------------- PART 4: Group A vs B ----------------
print("\n== PART 4  Group A vs B (sanity check only) ==")
for n in names:
    a=d[d.Group_AB=='A'][f"PS_{n}"]; b=d[d.Group_AB=='B'][f"PS_{n}"]
    U,p=mannwhitneyu(a,b); cliff=2*U/(len(a)*len(b))-1   # rank-biserial / Cliff's delta
    print(f"  {n:12s} A_med={a.median():.3f} B_med={b.median():.3f} p={p:.3f} Cliff_d={cliff:+.2f}")

# ---------------- PART 5: interface-size bias ----------------
print("\n== PART 5  interface-size bias ==")
# candidate length from ExoCarta PDBs (candidate proteins are in ExoCarta)
import glob,os
plen={}
for pdb in glob.glob("ExoCarta_PDB_Files/*.pdb"):
    g=os.path.basename(pdb).split("_")[0]
    n=sum(1 for l in open(pdb) if l.startswith("ATOM") and l[12:16].strip()=="CA")
    plen[g]=n
d["cand_len"]=d.Protein.map(plen)
have=d.dropna(subset=["cand_len"])
print(f"candidate length mapped for {len(have)}/{len(d)} pairs (from ExoCarta PDBs)")
print(f"  contacts vs candidate length : Pearson={pearsonr(have.contacts,have.cand_len)[0]:.3f}")
print(f"  dG       vs candidate length : Pearson={pearsonr(have.dG,have.cand_len)[0]:.3f}")
print("  mean contacts by protein (largest ECM vs small):")
mc=d.groupby("Protein").contacts.mean().sort_values(ascending=False)
print("   top5:",{k:round(v) for k,v in mc.head(5).items()}," bottom5:",{k:round(v) for k,v in mc.tail(5).items()})
# size-controlled diagnostic (NOT added to PS): dG per contact
d["dG_per_contact"]=d.dG/d.contacts
a=d[d.Group_AB=='A'].dG_per_contact; b=d[d.Group_AB=='B'].dG_per_contact
print(f"  size-controlled dG/contact: A_med={a.median():.4f} B_med={b.median():.4f} "
      f"p={mannwhitneyu(a,b).pvalue:.3f}  (diagnostic only)")
