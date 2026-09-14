from fastapi import APIRouter
from app.api.schemas.models import ReceptorSummary
from app.services import aggregate_service as agg

router = APIRouter(prefix="/receptors", tags=["receptors"])


@router.get("", response_model=list[ReceptorSummary])
def list_receptors():
    return agg.receptors()
