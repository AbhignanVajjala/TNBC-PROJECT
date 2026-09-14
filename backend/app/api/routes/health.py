from fastapi import APIRouter
from app.config import get_settings
from app.api.schemas.models import HealthResponse
from app.data.repositories.interaction_repository import get_repository

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health():
    S = get_settings()
    rows = get_repository().all()
    return {
        "status": "ok",
        "app": S.app_name,
        "version": S.app_version,
        "interactions_loaded": len(rows),
        "structures_available": sum(1 for r in rows if r["structure"]["pdb_available"]),
    }
