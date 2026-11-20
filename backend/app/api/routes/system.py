import json
from fastapi import APIRouter
from app.config import get_settings
from app.data.repositories.interaction_repository import get_repository
from app.utils.integrity import manifest_integrity
from app.services.structure_service import resolve_pdb_path

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
            integrity = manifest_integrity(S.manifest, S.data_dir.parent)["integrity"]
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
            "structures_resolved": sum(1 for r in rows if resolve_pdb_path(r["interaction_id"]) is not None),
            "manifest_present": manifest_ok,
            "integrity": integrity,
            "database": "not used (CSV-backed, in-memory)",
        },
    }
