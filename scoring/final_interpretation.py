"""
FINAL EXO-RANK interpretation — apply the LOCKED methodology, no score changes.
Produces the shortlist, receptor/candidate summaries, robustness tiers, leave-one-source-out,
rank-stability, Group A/B, glycolytic, avb3. Read-only on scores. Run with anaconda python.
"""
import pandas as pd, numpy as np
from scipy.stats import spearmanr, mannwhitneyu, kruskal

df = pd.read_csv("outputs/final_score_calculation.csv").merge(
     pd.read_csv("outputs/biological_feasibility_score.csv")[["Protein","BS_reason"]], on="Protein", how="left")
df["n_src"] = df.Coverage.map({"1/3":1,"2/3":2,"3/3":3})
SRC = ["AFS","PS","SS"]

# ---------- weight-scheme ranks for stability ----------
def tps_w(row, w):
    av=[(s,row[s]) for s in SRC if pd.notna(row[s])]
    return sum(w[s]*v for s,v in av)/sum(w[s] for s,_ in av) if av else np.nan
SCHEMES={"equal":(1/3,1/3,1/3),"a":(.5,.3,.2),"b":(.5,.2,.3),"c":(.4,.35,.25),"d":(.4,.3,.3)}
for n,(x,y,z) in SCHEMES.items():
    df[f"TPS_{n}"]=df.apply(lambda r:tps_w(r,{"AFS":x,"PS":y,"SS":z}),axis=1)
    df[f"rk_{n}"]=df[f"TPS_{n}"].rank(ascending=False,method="min")
rkcols=[f"rk_{n}" for n in SCHEMES]
df["rank_min"]=df[rkcols].min(axis=1); df["rank_max"]=df[rkcols].max(axis=1)
df["rank_range"]=df["rank_max"]-df["rank_min"]

# ---------- leave-one-source-out ----------
def tps_subset(row, srcs):
    av=[(s,row[s]) for s in srcs if pd.notna(row[s])]
    return np.mean([v for _,v in av]) if av else np.nan
for combo,label in [(["AFS"],"AFS_only"),(["PS"],"PS_only"),(["SS"],"SS_only"),
                    (["AFS","PS"],"AFS_PS"),(["AFS","SS"],"AFS_SS"),(["PS","SS"],"PS_SS")]:
    df[f"TPS_{label}"]=df.apply(lambda r:tps_subset(r,combo),axis=1)

# ---------- preferred shortlist ----------
pref = df[(df.n_src>=2)&(df.BS_flag!="Low")].copy().sort_values(
        ["TPS","n_src"],ascending=[False,False]).reset_index(drop=True)
pref.insert(0,"Rank_pref",pref.index+1)

# distribution-derived TPS thresholds (explain in report)
q = pref.TPS.quantile([.25,.5,.75]).round(3).to_dict()
hi_tps = pref.TPS.quantile(.75)                # "high TPS" = top quartile of shortlist
stable = pref.rank_range.median()              # "stable" = rank swing <= median swing

def tier(r):
    if r.BS_flag=="Low": return "Tier4"
    high = r.TPS>=hi_tps; stab=r.rank_range<=stable
    if high and r.n_src==3 and r.BS_flag=="High" and stab: return "Tier1"
    if high and r.n_src>=2 and r.BS_flag in ("High","Medium") and stab: return "Tier2"
    if high: return "Tier3"
    return "Tier3" if r.BS_flag in("High","Medium") else "Tier4"
pref["Robustness_tier"]=pref.apply(tier,axis=1)

def interp(r):
    parts=[f"{r.BS_flag}-BS", f"cov {r.Coverage}"]
    dom=max(SRC,key=lambda s:(-1 if pd.isna(r[s]) else r[s]))
    parts.append(f"{dom}-led")
    if r.rank_range>stable*3: parts.append("weight-sensitive")
    return "; ".join(parts)
pref["Interpretation"]=pref.apply(interp,axis=1)

OUT=["Rank_pref","Target No.","Receptor","Protein","Group","Group_AB",
     "AFS","PS","SS","TPS","Coverage","BS_flag","BS_reason","Robustness_tier","Interpretation"]
pref[OUT].rename(columns={"Rank_pref":"Rank"}).to_csv("outputs/final_preferred_shortlist.csv",index=False)

print(f"=== PREFERRED SHORTLIST: {len(pref)} pairs ===")
print(f"TPS quartiles (shortlist): {q}  | 'high TPS' cut (Q75)={hi_tps:.3f}")
print(f"stable-rank cut (median rank_range)={stable:.0f}")
print("Robustness tiers:", pref.Robustness_tier.value_counts().to_dict())
print("\nTOP 20:")
for _,r in pref.head(20).iterrows():
    print(f"  #{int(r.Rank_pref):<2d} T{int(r['Target No.'])} {str(r.Receptor)[:14]:14s} ~{r.Protein:9.9s} "
          f"[{r.Group_AB}] TPS={r.TPS:.3f} {r.Coverage} BS={r.BS_flag[:4]:4s} {r.Robustness_tier}")

# ---------- receptor-level ----------
rec_rows=[]
for t,g in pref.groupby("Target No."):
    g=g.sort_values("TPS",ascending=False).reset_index(drop=True)
    row={"Receptor":g.Receptor.iloc[0],"Target No.":t}
    for i in range(3):
        if i<len(g):
            row[f"Rank_{i+1}_Protein"]=g.Protein[i]; row[f"Rank_{i+1}_TPS"]=round(g.TPS[i],3)
        else:
            row[f"Rank_{i+1}_Protein"]=""; row[f"Rank_{i+1}_TPS"]=np.nan
    row["Rank_1_Coverage"]=g.Coverage[0]; row["Rank_1_BS"]=g.BS_flag[0]
    rec_rows.append(row)
rec=pd.DataFrame(rec_rows).sort_values("Rank_1_TPS",ascending=False)
rec[["Receptor","Rank_1_Protein","Rank_1_TPS","Rank_1_Coverage","Rank_1_BS",
     "Rank_2_Protein","Rank_2_TPS","Rank_3_Protein","Rank_3_TPS"]].to_csv(
     "outputs/receptor_top_candidates.csv",index=False)

# ---------- candidate-level (across ALL receptors, using full df TPS) ----------
cand_rows=[]
top10=set(pref.head(10).Protein); top20set=set()
p20=pref.head(20)
for prot,g in df.groupby("Protein"):
    sl=pref[pref.Protein==prot]
    cand_rows.append({"Protein":prot,"BS_flag":g.BS_flag.iloc[0],
        "n_preferred_pairs":len(sl),
        "mean_TPS":round(g.TPS.mean(),3),"median_TPS":round(g.TPS.median(),3),
        "max_TPS":round(g.TPS.max(),3),
        "top10_appearances":int((pref.head(10).Protein==prot).sum()),
        "top20_appearances":int((pref.head(20).Protein==prot).sum())})
cand=pd.DataFrame(cand_rows).sort_values("median_TPS",ascending=False)
cand.to_csv("outputs/candidate_summary.csv",index=False)

# ---------- source contribution ----------
sc=[]
for label in ["AFS_only","PS_only","SS_only","AFS_PS","AFS_SS","PS_SS"]:
    d=df[["TPS",f"TPS_{label}"]].dropna()
    sc.append({"variant":label,"spearman_vs_full_TPS":round(spearmanr(d.TPS,d[f"TPS_{label}"]).correlation,3),
               "n_pairs":len(d)})
pd.DataFrame(sc).to_csv("outputs/source_contribution_analysis.csv",index=False)
print("\n=== leave-one-source-out (Spearman vs full TPS) ===")
for r in sc: print(f"  {r['variant']:9s} rho={r['spearman_vs_full_TPS']:+.3f} (n={r['n_pairs']})")

# ---------- rank stability ----------
df[["Target No.","Protein","TPS","rank_min","rank_max","rank_range"]].sort_values("rank_range",ascending=False).to_csv(
    "outputs/final_rank_stability.csv",index=False)
print("\nMost weight-sensitive shortlist pairs:")
for _,r in pref.sort_values("rank_range",ascending=False).head(6).iterrows():
    print(f"  {r.Protein} @T{int(r['Target No.'])} rank {int(r.rank_min)}-{int(r.rank_max)} (swing {int(r.rank_range)})")

# ---------- Group A/B ----------
print("\n=== GROUP A/B (sanity) ===")
for c in ["TPS","AFS","PS","SS"]:
    a=df[df.Group_AB=="A"][c].dropna(); b=df[df.Group_AB=="B"][c].dropna()
    U,p=mannwhitneyu(a,b); print(f"  {c}: A_med={a.median():.3f} B_med={b.median():.3f} p={p:.3f} d={2*U/(len(a)*len(b))-1:+.2f}")
print("  shortlist enrichment: A=%d/100 B=%d/100"%((pref.Group_AB=='A').sum(),(pref.Group_AB=='B').sum()))

# ---------- glycolytic / modelability ----------
print("\n=== GLYCOLYTIC / MODELABILITY ===")
gly=["PGK1","LDHA","ALDOA","PKM","TKT","TPI1","GAPDH","ENO1"]
for prot in gly:
    g=df[df.Protein==prot]
    print(f"  {prot:6s} BS={g.BS_flag.iloc[0]:6s} maxAFS={g.AFS.max():.3f} maxTPS={g.TPS.max():.3f} "
          f"in_shortlist={int(((g.n_src>=2)&(g.BS_flag!='Low')).sum())}/{len(g)}")

# ---------- avb3 ----------
print("\n=== avb3 (target 6) ===")
a6=df[df['Target No.']==6].sort_values("TPS",ascending=False)
for _,r in a6.iterrows():
    surv="PREFERRED" if (r.n_src>=2 and r.BS_flag!="Low") else "excluded"
    print(f"  {r.Protein:9s} [{r.Group_AB}] TPS={r.TPS:.3f} {r.Coverage} BS={r.BS_flag:6s} SS={r.SS if pd.notna(r.SS) else 'NA'} -> {surv}")
print("\nWrote: final_preferred_shortlist, receptor_top_candidates, candidate_summary, "
      "source_contribution_analysis, final_rank_stability .csv")
