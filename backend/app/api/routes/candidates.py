from fastapi import APIRouter
from app.api.schemas.models import CandidateSummary
from app.services import aggregate_service as agg

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateSummary])
def list_candidates():
    return agg.candidates()
