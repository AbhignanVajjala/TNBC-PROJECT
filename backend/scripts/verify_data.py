"""Data-integrity check for the portable backend.

Verifies: required files exist, hashes match MANIFEST.json, structures exist,
interaction records load, and every interaction maps to an existing PDB.

Run (from backend/):  python scripts/verify_data.py     ->  prints PASS or FAIL
Exit code 0 = PASS, 1 = FAIL.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings

S = get_settings()
DATA_ROOT = S.data_dir.parent


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    errors, checks = [], 0

    if not S.manifest.exists():
        print("FAIL: MANIFEST.json missing (run scripts/build_manifest.py)")
        return 1
    manifest = json.loads(S.manifest.read_text(encoding="utf-8"))

    # 1) manifest files exist + hashes match
    for e in manifest["data_files"] + manifest["structures"]:
        checks += 1
        path = DATA_ROOT / e["file"]
        if not path.exists():
            errors.append(f"missing file: {e['file']}"); continue
        if path.stat().st_size != e["size_bytes"]:
            errors.append(f"size mismatch: {e['file']}")
        if sha256(path) != e["sha256"]:
            errors.append(f"hash mismatch: {e['file']}")

    # 2) required files present
    for e in manifest["data_files"]:
        if e["required"] and not (DATA_ROOT / e["file"]).exists():
            errors.append(f"required file missing: {e['file']}")

    # 3) interaction records load + map to existing PDBs
    try:
        from app.data.repositories.interaction_repository import InteractionRepository
        repo = InteractionRepository()
        recs = repo.all()
        checks += 1
        if len(recs) == 0:
            errors.append("no interaction records loaded")
        n_struct = 0
        for r in recs:
            if r["structure"]["pdb_available"]:
                f = S.pdb_dir / r["structure"]["pdb_file"]
                if not f.exists():
                    errors.append(f"structure file missing for {r['interaction_id']}: {r['structure']['pdb_file']}")
                else:
                    n_struct += 1
        print(f"  interactions loaded : {len(recs)}")
        print(f"  structures resolved : {n_struct}")
    except Exception as ex:
        errors.append(f"repository load failed: {ex}")

    print(f"  data files checked  : {len(manifest['data_files'])}")
    print(f"  structures checked  : {len(manifest['structures'])}")

    if errors:
        print(f"\nFAIL ({len(errors)} problem(s)):")
        for e in errors[:30]:
            print("   -", e)
        return 1
    print("\nPASS: all required data present and integrity-verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
