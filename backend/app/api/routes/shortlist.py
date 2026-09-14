from fastapi import APIRouter, Query
from app.services import aggregate_service as agg

router = APIRouter(prefix="/shortlist", tags=["shortlist"])


@router.get("")
def get_shortlist(limit: int = Query(200, ge=1, le=500), offset: int = Query(0, ge=0)):
    """Preferred shortlist: coverage >= 2/3 AND BS != Low, ranked by TPS."""
    return agg.shortlist(limit=limit, offset=offset)
