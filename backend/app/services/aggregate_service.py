"""Receptor-level, candidate-level, and shortlist aggregations (in-memory)."""
from statistics import median
from app.data.repositories.interaction_repository import get_repository


def receptors():
    rows = get_repository().all()
    by_rec: dict[str, list] = {}
    for r in rows:
        by_rec.setdefault(r["receptor"], []).append(r)
    out = []
    for rec, items in by_rec.items():
        pref = [i for i in items if i["final"]["preferred"]]
        top = max(items, key=lambda i: (i["final"]["TPS"] is not None, i["final"]["TPS"]))
        out.append({
            "receptor": rec,
            "target_no": items[0]["target_no"],
            "n_candidates": len(items),
            "n_preferred": len(pref),
            "top_candidate": top["candidate_protein"],
            "top_TPS": top["final"]["TPS"],
        })
    return sorted(out, key=lambda x: (x["top_TPS"] is None, -(x["top_TPS"] or 0)))


def candidates():
    rows = get_repository().all()
    by_cand: dict[str, list] = {}
    for r in rows:
        by_cand.setdefault(r["candidate_protein"], []).append(r)
    out = []
    for cand, items in by_cand.items():
        tps = [i["final"]["TPS"] for i in items if i["final"]["TPS"] is not None]
        pref = [i for i in items if i["final"]["preferred"]]
        out.append({
            "candidate_protein": cand,
            "BS_flag": items[0]["biology"]["BS"],
            "n_pairs": len(items),
            "n_preferred": len(pref),
            "median_TPS": round(median(tps), 4) if tps else None,
            "max_TPS": round(max(tps), 4) if tps else None,
        })
    return sorted(out, key=lambda x: (x["median_TPS"] is None, -(x["median_TPS"] or 0)))


def shortlist(limit=200, offset=0):
    rows = [r for r in get_repository().all() if r["final"]["preferred"]]
    rows = sorted(rows, key=lambda r: (r["final"]["TPS"] is None, -(r["final"]["TPS"] or 0)))
    total = len(rows)
    page = rows[offset: offset + limit]
    items = [{
        "interaction_id": r["interaction_id"], "receptor": r["receptor"],
        "candidate_protein": r["candidate_protein"], "group": r["group"],
        "TPS": r["final"]["TPS"], "coverage": r["final"]["coverage"],
        "BS_flag": r["biology"]["BS"], "rank": r["final"]["rank"],
    } for r in page]
    return {"total": total, "limit": limit, "offset": offset, "count": len(page),
            "criterion": "coverage >= 2/3 AND BS != Low", "items": items}
