import json
from fastapi import APIRouter
from app.config import get_settings
from app.data.repositories.interaction_repository import get_repository

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/status")
def system_status():
    S = get_settings()
    rows = get_repository().all()
    pdb_count = len(list(S.pdb_dir.glob("*.pdb"))) if S.pdb_dir.exists() else 0

    integrity = "unknown"
    manifest_ok = S.manifest.exists()
    if manifest_ok:
        try:
            m = json.loads(S.manifest.read_text(encoding="utf-8"))
            data_root = S.data_dir.parent
            missing = [e["file"] for e in m["data_files"] + m["structures"]
                       if not (data_root / e["file"]).exists()]
            integrity = "verified" if not missing else f"incomplete ({len(missing)} missing)"
        except Exception:
            integrity = "manifest_unreadable"

    return {
        "status": "ok",
        "api": {"name": S.app_name, "version": S.app_version},
        "data": {
            "data_dir_available": S.data_dir.exists(),
            "structures_dir_available": S.pdb_dir.exists(),
            "interactions": len(rows),
            "pdb_files": pdb_count,
            "structures_resolved": sum(1 for r in rows if r["structure"]["pdb_available"]),
            "manifest_present": manifest_ok,
            "integrity": integrity,
            "database": "not used (CSV-backed, in-memory)",
        },
    }
