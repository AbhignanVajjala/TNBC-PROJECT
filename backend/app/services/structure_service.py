"""Locate and serve structure files. Only whitelisted filenames from the structure
index are served (no arbitrary filesystem paths from requests)."""
from pathlib import Path
from app.config import get_settings
from app.data.repositories.interaction_repository import get_repository

S = get_settings()


def structure_meta(interaction_id: str):
    r = get_repository().get(interaction_id.strip().upper())
    if r is None:
        return None
    st = dict(r["structure"])
    st["interaction_id"] = r["interaction_id"]
    st["receptor"] = r["receptor"]
    st["candidate_protein"] = r["candidate_protein"]
    st["viewer_hint"] = ("Serve /structure/pdb to Mol*/3Dmol.js/NGL; chain A = receptor, "
                         "chain B = candidate (receptor sequence first).") if st["pdb_available"] else None
    return st


def resolve_pdb_path(interaction_id: str) -> Path | None:
    """Return the on-disk PDB path ONLY if the interaction exists and its filename is
    the whitelisted one from the index (prevents path traversal)."""
    r = get_repository().get(interaction_id.strip().upper())
    if r is None or not r["structure"]["pdb_available"]:
        return None
    fname = r["structure"]["pdb_file"]
    # security: use only the basename recorded in the index, resolve under PDB_DIR
    candidate = (S.pdb_dir / Path(fname).name).resolve()
    pdb_root = S.pdb_dir.resolve()
    if pdb_root not in candidate.parents or not candidate.is_file():
        return None
    return candidate
