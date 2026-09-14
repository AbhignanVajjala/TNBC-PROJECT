"""
Build the interaction -> structure-file index from BUNDLED data (portable).

Reads:  backend/data/raw/final_score_calculation.csv  (Target No. + Group -> Protein/Receptor)
        backend/data/structures/*.pdb                  (bundled structures)
Writes: backend/data/processed/structure_index.csv

Structure filenames encode (target, group):
  AF2 (ColabFold):  <target>test<group>_<hash>_..._unrelaxed_rank_001_...pdb
  AF3:              fold_<target>_test_<group>_model_0.pdb
Interaction key = Target No. + Protein. Original filenames are preserved (provenance).

Run (from backend/):  python scripts/build_structure_index.py
"""
import glob, os, re, sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # make `app` importable
from app.config import get_settings

S = get_settings()


def interaction_id(target, protein):
    return f"T{int(target)}_{str(protein).strip().upper()}"


def main():
    scores = S.data_dir / "final_score_calculation.csv"
    sheet = pd.read_csv(scores, encoding="utf-8")
    tg_to_pair = {(int(r["Target No."]), int(r["Group"])): (r["Protein"], r["Receptor"])
                  for _, r in sheet.iterrows()}

    tg_to_file = {}
    for p in glob.glob(str(S.pdb_dir / "*.pdb")):
        name = os.path.basename(p)
        m3 = re.match(r"fold_(\d+)_test_(\d+)_", name, re.I)      # AF3
        m2 = re.match(r"(\d+)test(\d+)", name, re.I)              # AF2
        if m3:
            tg = (int(m3.group(1)), int(m3.group(2))); src, mtype = "AlphaFold3", "alphafold3"
        elif m2:
            tg = (int(m2.group(1)), int(m2.group(2))); src, mtype = "ColabFold (AlphaFold2-Multimer)", "alphafold2_multimer_v3"
        else:
            print("WARN unmatched:", name); continue
        tg_to_file[tg] = (name, src, mtype)

    rows = []
    for tg, (protein, receptor) in tg_to_pair.items():
        f = tg_to_file.get(tg)
        rows.append({
            "interaction_id": interaction_id(tg[0], protein),
            "target_no": tg[0], "group": tg[1], "protein": protein, "receptor": receptor,
            "structure_filename": f[0] if f else "",
            "structure_source": f[1] if f else "",
            "model_type": f[2] if f else "",
            "structure_format": "pdb" if f else "",
            "available": bool(f),
        })
    idx = pd.DataFrame(rows).sort_values(["target_no", "group"])
    S.structure_index.parent.mkdir(parents=True, exist_ok=True)
    idx.to_csv(S.structure_index, index=False, encoding="utf-8")
    print(f"Wrote {S.structure_index}")
    print(f"  {len(idx)} interactions, {int(idx.available.sum())} with structures, "
          f"{int((~idx.available).sum())} missing")
    if int((~idx.available).sum()):
        print("  MISSING:", idx[~idx.available].interaction_id.tolist())


if __name__ == "__main__":
    main()
