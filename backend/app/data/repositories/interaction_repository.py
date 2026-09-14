"""In-memory repository of normalized interaction records.

Primary interaction key = Target No. + Protein (NEVER Target No. alone).
Loads all sources once at startup (~200 rows) and builds nested records.
Missing numeric values -> None (never 0). No scoring is recomputed here; the
locked pipeline values are served as-is with provenance.
"""
import math
from app.data.loaders.source_loader import load_all, SOURCE_FILES


def _n(v):
    """NaN/None -> None; numpy scalar -> python; else value."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):
        try:
            v = v.item()
        except Exception:
            pass
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def make_id(target, protein) -> str:
    return f"T{int(target)}_{str(protein).strip().upper()}"


class InteractionRepository:
    def __init__(self):
        self._by_id: dict[str, dict] = {}
        self._load()

    # ---------------- build ----------------
    def _load(self):
        d = load_all()
        af = d["af"].set_index(["Target No.", "Protein"])
        ipae = d["ipae"].set_index(["Target No.", "Protein"])
        prod = d["prodigy"].set_index(["Target No.", "Protein"])
        string = d["string"].set_index(["Target No.", "Protein"])
        bio = d["bio"].set_index("Protein")
        dg = d["dg"].set_index(["Target No.", "Group"])
        struct = d["structure"].set_index(["target_no", "group"])

        for _, r in d["final"].iterrows():
            t, g, prot = int(r["Target No."]), int(r["Group"]), r["Protein"]
            iid = make_id(t, prot)
            rec = {
                "interaction_id": iid,
                "target_no": t,
                "receptor": r["Receptor"],
                "candidate_protein": prot,
                "group": r["Group_AB"],           # A / B
                "group_number": g,
                "structure": self._structure(struct, t, g, iid),
                "alphafold": self._alphafold(af, ipae, r, t, prot),
                "prodigy": self._prodigy(prod, dg, t, g, prot, r),
                "string": self._string(string, t, prot),
                "biology": self._biology(bio, prot),
                "final": self._final(r),
                "provenance": {
                    "structure": SOURCE_FILES["structure_index"],
                    "alphafold": [SOURCE_FILES["alphafold_raw"], SOURCE_FILES["interface_pae"],
                                  SOURCE_FILES["final"]],
                    "prodigy": [SOURCE_FILES["prodigy_info"], SOURCE_FILES["prodigy_dg"],
                                SOURCE_FILES["final"]],
                    "string": SOURCE_FILES["string"],
                    "biology": SOURCE_FILES["biology"],
                    "final": SOURCE_FILES["final"],
                },
            }
            self._by_id[iid] = rec

    # ---------------- blocks ----------------
    def _structure(self, struct, t, g, iid):
        try:
            s = struct.loc[(t, g)]
            avail = bool(s["available"])
            fname = s["structure_filename"] if avail else None
            return {
                "pdb_available": avail,
                "pdb_file": fname,
                "pdb_download_url": f"/api/interactions/{iid}/structure/pdb" if avail else None,
                "structure_source": _n(s["structure_source"]) or None,
                "model_type": _n(s["model_type"]) or None,
                "format": _n(s["structure_format"]) or None,
            }
        except KeyError:
            return {"pdb_available": False, "pdb_file": None, "pdb_download_url": None,
                    "structure_source": None, "model_type": None, "format": None}

    def _alphafold(self, af, ipae, final_row, t, prot):
        a = af.loc[(t, prot)] if (t, prot) in af.index else None
        ip = ipae.loc[(t, prot)] if (t, prot) in ipae.index else None
        pae_range = _n(a["PAE Range(min-max)"]) if a is not None else None
        return {
            "ipTM": _n(a["ipTM"]) if a is not None else None,
            "pTM": _n(a["pTM"]) if a is not None else None,
            "mean_pLDDT": _n(a["Mean pLDDT"]) if a is not None else None,
            "mean_PAE": _n(a["Mean PAE"]) if a is not None else None,
            "median_PAE": _n(a["Median PAE"]) if a is not None else None,
            "max_PAE": _n(a["Max PAE"]) if a is not None else None,
            "PAE_range": pae_range,
            "interface_PAE": _n(ip["interface_PAE"]) if ip is not None else None,
            "af_source": _n(ip["af_source"]) if ip is not None else None,
            "AFS": _n(final_row["AFS"]),          # locked value from final_score_calculation.csv
        }

    def _prodigy(self, prod, dg, t, g, prot, final_row):
        p = prod.loc[(t, prot)] if (t, prot) in prod.index else None
        gd = dg.loc[(t, g)] if (t, g) in dg.index else None
        if p is None and gd is None:
            available = False
        else:
            available = _n(gd["delta_G"]) is not None if gd is not None else False
        contacts = {
            "charged_charged": _n(p["Charged- charged contacts"]) if p is not None else None,
            "charged_polar": _n(p["charged- polar contacts"]) if p is not None else None,
            "charged_apolar": _n(p["charged- apolar contacts"]) if p is not None else None,
            "polar_polar": _n(p["polar- polar contacts"]) if p is not None else None,
            "apolar_polar": _n(p["apolar- polar contacts"]) if p is not None else None,
            "apolar_apolar": _n(p["apolar- apolar contacts"]) if p is not None else None,
        }
        return {
            "available": bool(available),
            "PS": _n(final_row["PS"]),          # winsorized ΔG score (locked, final_score_calculation.csv)
            "delta_G": _n(gd["delta_G"]) if gd is not None else None,
            "Kd": _n(gd["Kd_parsed"]) if gd is not None else None,
            "intermolecular_contacts": _n(p["Intermolecular contacts"]) if p is not None else None,
            "contacts": contacts,
            "NIS": {
                "charged": _n(p["NIS residues (% of charged NIS residues)"]) if p is not None else None,
                "apolar": _n(p["NIS residues (% of apolar NIS residues)"]) if p is not None else None,
            },
            "note": "Predicted energetic favorability (winsorized ΔG); not experimental affinity.",
        }

    def _string(self, string, t, prot):
        s = string.loc[(t, prot)] if (t, prot) in string.index else None
        has = bool(_n(s["has_string_evidence"])) if s is not None else False
        return {
            "has_evidence": has,
            "coexpression": _n(s["coexpression"]) if s is not None else None,
            "experimental": _n(s["experimental"]) if s is not None else None,
            "curated_database": _n(s["database"]) if s is not None else None,
            "pubmed": _n(s["textmining"]) if s is not None else None,
            "dominant_channel": _n(s["dominant_channel"]) if s is not None else None,
            "combined_score": _n(s["STRING_combined"]) if s is not None else None,
            "SS": _n(s["STRING_combined"]) if s is not None else None,
            "note": "Prior biological/network association evidence (text-mining-dominated); "
                    "not experimental confirmation of interaction.",
        }

    def _biology(self, bio, prot):
        b = bio.loc[prot] if prot in bio.index else None
        if b is None:
            return {"BS": None, "localization": None, "surface_feasibility": None,
                    "conflict_flag": None, "uniprot_id": None, "reason": None}
        return {
            "BS": _n(b["BS_flag"]),
            "localization": _n(b["Localization_summary"]),
            "surface_feasibility": _n(b["Surface_evidence"]),
            "conflict_flag": bool(_n(b["Conflict_flag"])) if _n(b["Conflict_flag"]) is not None else None,
            "uniprot_id": _n(b["UniProt_ID"]),
            "reason": _n(b["BS_reason"]),
        }

    def _final(self, r):
        cov = _n(r["Coverage"])                 # "1/3" | "2/3" | "3/3"
        cov_n = int(str(cov).split("/")[0]) if cov else None
        bs = _n(r["BS_flag"])
        # locked shortlist rule: coverage >= 2/3 AND BS != Low
        cov_ok = (cov_n or 0) >= 2
        bs_ok = bs != "Low"
        preferred = cov_ok and bs_ok
        if preferred:
            reason = None
        elif not cov_ok:
            reason = f"coverage {cov} < 2/3 (insufficient evidence sources)"
        else:
            reason = "BS = Low (low EV-surface feasibility)"
        return {
            "TPS": _n(r["TPS"]),
            "PS": _n(r["PS"]),
            "coverage": cov,
            "coverage_n": cov_n,
            "rank": _n(r["Rank"]),
            "preferred": bool(preferred),
            "BS_flag": bs,
            "exclusion_reason": reason,
            "interpretation": "Computationally prioritized candidate for experimental validation.",
        }

    # ---------------- accessors ----------------
    def all(self) -> list[dict]:
        return list(self._by_id.values())

    def get(self, interaction_id: str) -> dict | None:
        return self._by_id.get(interaction_id)

    def exists(self, interaction_id: str) -> bool:
        return interaction_id in self._by_id


_repo: InteractionRepository | None = None


def get_repository() -> InteractionRepository:
    global _repo
    if _repo is None:
        _repo = InteractionRepository()
    return _repo
