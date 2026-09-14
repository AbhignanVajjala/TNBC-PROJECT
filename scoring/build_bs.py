"""
Build REAL Biological Feasibility Score (BS) for the 21 candidates — EXO-RANK.
Evidence: UniProt subcellular location + topology (fetched, verifiable). BS is an
ORDINAL feasibility FLAG (High/Medium/Low), NOT a number, NOT part of TPS.
Frozen rule (see biological_feasibility_methodology.md). Read-only; adds BS_flag only.
Run: python scoring/build_bs.py
"""
import re, numpy as np, pandas as pd
from scipy.stats import spearmanr, kruskal, mannwhitneyu

# corrected candidate -> UniProt accession (TKT fixed: Q16832 is DDR2, real TKT=P29401)
ACC = {"ALDOA":"P04075","ANXA2":"P07355","BSG":"P35613","CD44":"P16070","EEF1A1":"P68104",
       "ENO1":"P06733","FN1":"P02751","GAPDH":"P04406","HSP90AA1":"P07900","ITGA6":"P23229",
       "ITGB1":"P05556","LDHA":"P00338","LGALS3BP":"Q08380","MFGE8":"Q08431","PGK1":"P00558",
       "PKM":"P14618","SDCBP":"O00560","SLC3A2":"P08195","THBS1":"P07996","TKT":"P29401","TPI1":"P60174"}

u = pd.concat([pd.read_csv("outputs/_uniprot_bs.tsv", sep="\t"),
               pd.read_csv("outputs/_uniprot_tkt.tsv", sep="\t")]).fillna("")
u = u.set_index("Entry")

EXTERNAL = ["Cell membrane", "Cell surface", "Secreted", "Extracellular", "Membrane"]
INTRA    = ["Cytoplasm", "Cytosol", "Nucleus", "Mitochond"]

def classify(acc):
    r = u.loc[acc]
    loc = re.sub(r"\{[^}]*\}", "", r["Subcellular location [CC]"]).replace("SUBCELLULAR LOCATION:", "").strip()
    tm  = bool(r["Transmembrane"]); sig = bool(r["Signal peptide"]); gpi = "GPI" in str(r["Lipidation"])
    ext = [e for e in EXTERNAL if e in loc]; intra = [i for i in INTRA if i in loc]
    secreted = ("Secreted" in loc) or ("Extracellular" in loc)
    # frozen rule
    if (tm and "Cell membrane" in loc) or gpi or (sig and secreted) or ("Cell surface" in loc):
        flag = "High"
    elif not ext and not tm and not sig and not gpi:
        flag = "Low"
    else:
        flag = "Medium"
    surf = []
    if tm: surf.append("transmembrane")
    if sig: surf.append("signal-peptide")
    if gpi: surf.append("GPI-anchor")
    if secreted: surf.append("secreted/ECM")
    if not surf: surf = ["none"]
    conflict = bool(intra) and bool(ext)
    return flag, loc[:150], ",".join(surf), conflict, bool(tm or sig or gpi)

# curated biological reason per candidate (transparent; classification itself is rule-based)
REASON = {
 "ITGB1":"Single-pass type I cell-membrane integrin (extracellular domain).",
 "ITGA6":"Single-pass type I cell-membrane integrin + lipid anchor.",
 "CD44":"Single-pass type I cell-membrane adhesion receptor; also secreted.",
 "BSG":"Single-pass type I cell-membrane glycoprotein (basigin/CD147).",
 "SLC3A2":"Single-pass type II cell-membrane protein (CD98hc).",
 "FN1":"Canonical secreted ECM glycoprotein (signal peptide).",
 "THBS1":"Secreted matricellular; explicit 'Cell surface' annotation.",
 "LGALS3BP":"Canonical secreted/ECM glycoprotein (signal peptide).",
 "MFGE8":"Secreted, peripheral-membrane; binds phosphatidylserine on outer EV leaflet (EV-surface opsonin).",
 "ANXA2":"Secreted/ECM but NO signal peptide (unconventional); dual cytosolic — documented cell-surface translocation.",
 "ENO1":"Primarily cytosolic glycolytic enzyme; documented plasma-membrane translocation (plasminogen receptor).",
 "GAPDH":"Primarily cytosolic glycolytic enzyme; UniProt lists generic 'Membrane' (moonlighting); surface presentation conditional.",
 "HSP90AA1":"Nuclear/cytosolic chaperone; documented extracellular/cell-membrane (eHSP90) form.",
 "EEF1A1":"Cytosolic translation factor; peripheral cell-membrane association (moonlighting).",
 "SDCBP":"Cytoplasmic PDZ adaptor (syntenin); peripheral membrane but CYTOPLASMIC-facing (argues against outer EV surface).",
 "PGK1":"Cytosol + mitochondrion only; no membrane/surface annotation.",
 "LDHA":"Cytoplasm only; no membrane/surface annotation.",
 "ALDOA":"Cytoplasm/myofibril only; no membrane/surface annotation.",
 "PKM":"Cytoplasm/nucleus; no cell-membrane/surface annotation.",
 "TPI1":"Cytoplasm only; no membrane/surface annotation.",
 "TKT":"Cytosolic transketolase (P29401); no membrane/surface annotation. (ExoCarta ID Q16832 was DDR2 — corrected.)",
}

rows = []
for cand, acc in ACC.items():
    flag, loc, surf, conflict, has_topo = classify(acc)
    rows.append({"Protein": cand, "UniProt_ID": acc, "BS_flag": flag,
                 "Primary_evidence": "UniProt subcellular location + topology",
                 "Secondary_evidence": "CSPA/SURFY surfaceome (canonical surface proteins) — not programmatically retrieved this build",
                 "Localization_summary": loc, "Surface_evidence": surf,
                 "EV_surface_evidence": ("PS-binding outer-leaflet (MFGE8)" if cand=="MFGE8"
                                          else "not systematically retrieved (Vesiclepedia=EV presence, not surface)"),
                 "Conflict_flag": conflict, "BS_reason": REASON[cand],
                 "Source_citations": f"UniProt:{acc} (rest.uniprot.org); Bausch-Fluck 2015 CSPA; Bausch-Fluck 2018 SURFY; Pathan 2019 Vesiclepedia"})
bs = pd.DataFrame(rows)
bs.to_csv("outputs/biological_feasibility_score.csv", index=False)
print("BS distribution:", bs.BS_flag.value_counts().to_dict())
print(bs[["Protein","UniProt_ID","BS_flag","Surface_evidence","Conflict_flag"]].to_string(index=False))

# ---- attach to pairs & tests ----
fs = pd.read_csv("outputs/final_score_calculation.csv")
if "BS_flag" in fs.columns: fs = fs.drop(columns=["BS_flag"])
fs = fs.merge(bs[["Protein","BS_flag"]], on="Protein", how="left")
fs.to_csv("outputs/final_score_calculation.csv", index=False)   # ONLY adds BS_flag

ordm = {"Low":0,"Medium":1,"High":2}; fs["BSn"]=fs.BS_flag.map(ordm)
print("\n=== NON-CIRCULARITY: BS vs Group A/B ===")
ct = pd.crosstab(fs.drop_duplicates("Protein").Group_AB, fs.drop_duplicates("Protein").BS_flag)
print(ct.to_string())
a=fs[fs.Group_AB=="A"].BSn; b=fs[fs.Group_AB=="B"].BSn
U,p=mannwhitneyu(a,b); print(f"BSn A vs B: Cliff d={2*U/(len(a)*len(b))-1:+.2f} p={p:.1e}")
print("Within-group disagreements (non-circular signal):")
print("  Group A NOT High:", sorted(set(fs[(fs.Group_AB=='A')&(fs.BS_flag!='High')].Protein)))
print("  Group B NOT Low: ", sorted(set(fs[(fs.Group_AB=='B')&(fs.BS_flag!='Low')].Protein)))

print("\n=== INDEPENDENCE: BS vs AFS/PS/SS/TPS ===")
for c in ["AFS","PS","SS","TPS"]:
    d=fs[[c,"BSn"]].dropna(); print(f"  Spearman(BSn,{c})={spearmanr(d[c],d.BSn).correlation:+.3f}")
print(f"  Kruskal-Wallis TPS across BS categories: H-test p={kruskal(*[fs[fs.BS_flag==k].TPS.dropna() for k in ['Low','Medium','High']]).pvalue:.3f}")

print("\n=== GLYCOLYTIC CASE (PGK1/LDHA/ALDOA) ===")
print(fs[fs.Protein.isin(['PGK1','LDHA','ALDOA','GAPDH','ENO1'])]
      .groupby('Protein').agg(BS=('BS_flag','first'),
      maxAFS=('AFS','max'),n_shortlist=('In_shortlist','sum')).to_string())

print("\n=== SHORTLIST ANALYSIS (coverage>=2/3) ===")
sl = fs[fs.In_shortlist].copy()
print(f"shortlist size: {len(sl)}")
print("BS in shortlist:", sl.BS_flag.value_counts().to_dict())
print(f"would be EXCLUDED by BS=Low: {(sl.BS_flag=='Low').sum()}")
print("\nTop 15 shortlist pairs with BS flag:")
for _,r in sl.sort_values('TPS',ascending=False).head(15).iterrows():
    mark = " <-- LOW-BS FLAG" if r.BS_flag=="Low" else ""
    print(f"  #{int(r.Rank):<3d} T{int(r['Target No.'])} {str(r.Receptor)[:15]:15s} ~{r.Protein:9.9s} "
          f"TPS={r.TPS:.3f} cov={r.Coverage} BS={r.BS_flag}{mark}")
