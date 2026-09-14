"""Query/filter/paginate logic over the interaction repository (no file I/O here)."""
from app.data.repositories.interaction_repository import get_repository

SORT_FIELDS = {
    "TPS": lambda r: r["final"]["TPS"],
    "AFS": lambda r: r["alphafold"]["AFS"],
    "PS": lambda r: r["prodigy"]["PS"],
    "SS": lambda r: r["string"]["SS"],
    "coverage": lambda r: r["final"]["coverage_n"],
    "rank": lambda r: r["final"]["rank"],
    "receptor": lambda r: r["receptor"],
    "candidate": lambda r: r["candidate_protein"],
    "group": lambda r: r["group"],
    "BS": lambda r: r["biology"]["BS"],
}


def _summary(r: dict) -> dict:
    return {
        "interaction_id": r["interaction_id"],
        "target_no": r["target_no"],
        "receptor": r["receptor"],
        "candidate_protein": r["candidate_protein"],
        "group": r["group"],
        "AFS": r["alphafold"]["AFS"],
        "PS": r["prodigy"]["PS"],
        "SS": r["string"]["SS"],
        "TPS": r["final"]["TPS"],
        "coverage": r["final"]["coverage"],
        "rank": r["final"]["rank"],
        "BS_flag": r["final"]["BS_flag"],
        "preferred": r["final"]["preferred"],
    }


def list_interactions(receptor=None, candidate=None, group=None, bs=None,
                      preferred=None, min_coverage=None,
                      sort_by="rank", order="asc", limit=50, offset=0):
    repo = get_repository()
    rows = repo.all()

    def keep(r):
        if receptor and receptor.lower() not in r["receptor"].lower():
            return False
        if candidate and candidate.upper() != r["candidate_protein"].upper():
            return False
        if group and group.upper() != r["group"].upper():
            return False
        if bs and (r["biology"]["BS"] or "").lower() != bs.lower():
            return False
        if preferred is not None and r["final"]["preferred"] != preferred:
            return False
        if min_coverage is not None and (r["final"]["coverage_n"] or 0) < min_coverage:
            return False
        return True

    rows = [r for r in rows if keep(r)]

    key = SORT_FIELDS.get(sort_by, SORT_FIELDS["rank"])
    # None-safe sort: push None to the end regardless of order
    def sort_key(r):
        v = key(r)
        return (v is None, v)
    rows = sorted(rows, key=sort_key, reverse=(order == "desc"))

    total = len(rows)
    page = rows[offset: offset + limit]
    return {
        "total": total, "limit": limit, "offset": offset, "count": len(page),
        "items": [_summary(r) for r in page],
    }


def get_interaction(interaction_id: str):
    r = get_repository().get(interaction_id.strip().upper())
    if r is None:
        return None
    # attach PS to the prodigy block for the response (PS = TPS PRODIGY term, from final sheet)
    return r


def get_scores(interaction_id: str):
    r = get_interaction(interaction_id)
    if r is None:
        return None
    return {
        "interaction_id": r["interaction_id"],
        "AFS": {"value": r["alphafold"]["AFS"], "source": "final_score_calculation.csv"},
        "PS": {"value": r["prodigy"]["PS"], "source": "final_score_calculation.csv (winsorized ΔG)"},
        "SS": {"value": r["string"]["SS"], "source": "string_score.csv (STRING combined)"},
        "TPS": {"value": r["final"]["TPS"], "source": "mean of available {AFS,PS,SS}"},
        "coverage": r["final"]["coverage"],
        "coverage_n": r["final"]["coverage_n"],
        "rank": r["final"]["rank"],
        "preferred": r["final"]["preferred"],
        "BS_flag": r["final"]["BS_flag"],
        "exclusion_reason": r["final"]["exclusion_reason"],
        "interpretation": r["final"]["interpretation"],
    }


def get_evidence(interaction_id: str):
    r = get_interaction(interaction_id)
    if r is None:
        return None
    return {
        "interaction_id": r["interaction_id"],
        "receptor": r["receptor"],
        "candidate_protein": r["candidate_protein"],
        "prodigy": r["prodigy"],
        "string": r["string"],
        "biology": r["biology"],
        "provenance": r["provenance"],
    }
