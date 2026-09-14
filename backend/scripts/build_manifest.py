"""Generate backend/data/MANIFEST.json documenting every bundled data resource
(with SHA-256), so a copied backend can be verified as complete.

Run (from backend/):  python scripts/build_manifest.py
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings

S = get_settings()
DATA_ROOT = S.data_dir.parent

DESCRIPTIONS = {
    "final_score_calculation.csv": ("scores", "Final locked scores per pair: AFS, PS, SS, TPS, Coverage, Rank, BS_flag"),
    "ALPHAFOLD DATA.xlsx": ("alphafold", "Raw AlphaFold metrics: ipTM, pTM, pLDDT, PAE"),
    "interface_pae.csv": ("alphafold", "Interface PAE per pair"),
    "PRODIGY INFO.xlsx": ("prodigy", "PRODIGY contacts + NIS per pair"),
    "prodig_v1_parsed.xlsx": ("prodigy", "PRODIGY predicted ΔG / Kd per pair"),
    "string_score.csv": ("string", "STRING channels + combined score (SS) per pair"),
    "biological_feasibility_score.csv": ("biology", "Biological feasibility BS flag + localization per candidate"),
    "alphafold_normalized.csv": ("alphafold", "Normalized AlphaFold features"),
    "final_preferred_shortlist.csv": ("report", "121-pair preferred shortlist"),
    "receptor_top_candidates.csv": ("report", "Top candidates per receptor"),
    "candidate_summary.csv": ("report", "Per-candidate summary"),
    "final_experimental_panel.csv": ("report", "Recommended experimental panel"),
    "source_contribution_analysis.csv": ("report", "Leave-one-source-out analysis"),
    "final_rank_stability.csv": ("report", "Rank stability across weightings"),
    "structure_index.csv": ("index", "interaction_id -> structure filename mapping"),
}
REQUIRED = {  # files the API cannot function without
    "final_score_calculation.csv", "ALPHAFOLD DATA.xlsx", "interface_pae.csv",
    "PRODIGY INFO.xlsx", "prodig_v1_parsed.xlsx", "string_score.csv",
    "biological_feasibility_score.csv", "structure_index.csv",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def entry(path: Path, ftype: str, description: str):
    rel = path.relative_to(DATA_ROOT).as_posix()
    return {"file": rel, "type": ftype, "required": path.name in REQUIRED,
            "size_bytes": path.stat().st_size, "sha256": sha256(path),
            "description": description}


def main():
    files = []
    # data files (raw + processed)
    for p in sorted(list((S.data_dir).glob("*")) + [S.structure_index]):
        if p.is_file():
            ftype, desc = DESCRIPTIONS.get(p.name, ("data", p.name))
            files.append(entry(p, "PDB" if p.suffix == ".pdb" else ftype.upper() if False else ftype, desc))
    # structures
    pdbs = sorted(S.pdb_dir.glob("*.pdb"))
    structures = [entry(p, "PDB", "AlphaFold/ColabFold predicted receptor–candidate complex") for p in pdbs]

    manifest = {
        "name": "EXO-RANK backend data bundle",
        "generated_by": "scripts/build_manifest.py",
        "counts": {"data_files": len(files), "structures": len(structures),
                   "total": len(files) + len(structures)},
        "data_files": files,
        "structures": structures,
    }
    S.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {S.manifest}")
    print(f"  data_files={len(files)}  structures={len(structures)}  total={len(files)+len(structures)}")


if __name__ == "__main__":
    main()
