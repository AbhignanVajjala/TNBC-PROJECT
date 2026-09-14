from typing import Optional
from fastapi import APIRouter, Query
from app.api.schemas.models import Interaction, PaginatedInteractions
from app.services import interaction_service as svc
from app.utils.errors import APIError

router = APIRouter(prefix="/interactions", tags=["interactions"])

SORTABLE = ["TPS", "AFS", "PS", "SS", "coverage", "rank", "receptor", "candidate", "group", "BS"]


@router.get("", response_model=PaginatedInteractions)
def list_interactions(
    receptor: Optional[str] = Query(None, description="Substring match on receptor name"),
    candidate: Optional[str] = Query(None, description="Exact candidate protein (gene symbol)"),
    group: Optional[str] = Query(None, pattern="^[AaBb]$", description="Group A or B"),
    bs: Optional[str] = Query(None, description="BS flag: High / Medium / Low"),
    preferred: Optional[bool] = Query(None, description="Preferred shortlist only"),
    min_coverage: Optional[int] = Query(None, ge=1, le=3, description="Minimum #sources (1-3)"),
    sort_by: str = Query("rank"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    if sort_by not in SORTABLE:
        raise APIError(400, "invalid_query", f"sort_by must be one of {SORTABLE}")
    return svc.list_interactions(receptor, candidate, group, bs, preferred,
                                 min_coverage, sort_by, order, limit, offset)


@router.get("/{interaction_id}", response_model=Interaction)
def get_interaction(interaction_id: str):
    r = svc.get_interaction(interaction_id)
    if r is None:
        raise APIError(404, "not_found", f"Interaction '{interaction_id}' not found.")
    return r


@router.get("/{interaction_id}/scores")
def get_scores(interaction_id: str):
    r = svc.get_scores(interaction_id)
    if r is None:
        raise APIError(404, "not_found", f"Interaction '{interaction_id}' not found.")
    return r


@router.get("/{interaction_id}/evidence")
def get_evidence(interaction_id: str):
    r = svc.get_evidence(interaction_id)
    if r is None:
        raise APIError(404, "not_found", f"Interaction '{interaction_id}' not found.")
    return r
