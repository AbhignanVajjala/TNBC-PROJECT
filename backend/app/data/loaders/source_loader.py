"""Read the existing pipeline output files into DataFrames (read-only).
Filenames/columns were verified against the repository before implementation.
Missing values are preserved as NaN (never coerced to 0) and become null downstream."""
from pathlib import Path
import pandas as pd
from app.config import get_settings

S = get_settings()
D = S.data_dir

# provenance: logical block -> source file (surfaced by the API)
SOURCE_FILES = {
    "final": "final_score_calculation.csv",
    "alphafold_raw": "ALPHAFOLD DATA.xlsx",
    "interface_pae": "interface_pae.csv",
    "prodigy_info": "PRODIGY INFO.xlsx",
    "prodigy_dg": "prodig_v1_parsed.xlsx",
    "string": "string_score.csv",
    "biology": "biological_feasibility_score.csv",
    "structure_index": "structure_index.csv",
}


def _read(name: str) -> pd.DataFrame:
    path = D / name
    if not path.exists():
        raise FileNotFoundError(f"Required data file not found: {path}")
    # force UTF-8 for CSVs so unicode (αvβ3, en-dash) is correct regardless of OS locale
    return pd.read_excel(path) if path.suffix == ".xlsx" else pd.read_csv(path, encoding="utf-8")


def load_all() -> dict[str, pd.DataFrame]:
    """Load every source; PRODIGY 'N/A' strings coerced to NaN."""
    final = _read("final_score_calculation.csv")
    af = _read("ALPHAFOLD DATA.xlsx")
    ipae = _read("interface_pae.csv")
    prod = _read("PRODIGY INFO.xlsx")
    dg = _read("prodig_v1_parsed.xlsx").rename(columns={"Target No": "Target No.",
                                                        "ΔG (kcal/mol)": "delta_G", "Kd (M)": "Kd_parsed"})
    string = _read("string_score.csv")
    bio = _read("biological_feasibility_score.csv")
    struct = pd.read_csv(S.structure_index, encoding="utf-8")

    # coerce PRODIGY 'N/A' text -> numeric NaN
    prod_num = ["Kd", "Intermolecular contacts",
                "NIS residues (% of apolar NIS residues)", "NIS residues (% of charged NIS residues)",
                "Charged- charged contacts", "charged- polar contacts", "charged- apolar contacts",
                "polar- polar contacts", "apolar- polar contacts", "apolar- apolar contacts"]
    for c in prod_num:
        if c in prod.columns:
            prod[c] = pd.to_numeric(prod[c], errors="coerce")

    return {"final": final, "af": af, "ipae": ipae, "prodigy": prod, "dg": dg,
            "string": string, "bio": bio, "structure": struct}
