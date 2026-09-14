"""Pydantic response models = the API contract (drives OpenAPI/Swagger)."""
from typing import Optional, Any
from pydantic import BaseModel


class Structure(BaseModel):
    pdb_available: bool
    pdb_file: Optional[str] = None
    pdb_download_url: Optional[str] = None
    structure_source: Optional[str] = None
    model_type: Optional[str] = None
    format: Optional[str] = None


class AlphaFold(BaseModel):
    ipTM: Optional[float] = None
    pTM: Optional[float] = None
    mean_pLDDT: Optional[float] = None
    mean_PAE: Optional[float] = None
    median_PAE: Optional[float] = None
    max_PAE: Optional[float] = None
    PAE_range: Optional[str] = None
    interface_PAE: Optional[float] = None
    af_source: Optional[str] = None
    AFS: Optional[float] = None


class Contacts(BaseModel):
    charged_charged: Optional[float] = None
    charged_polar: Optional[float] = None
    charged_apolar: Optional[float] = None
    polar_polar: Optional[float] = None
    apolar_polar: Optional[float] = None
    apolar_apolar: Optional[float] = None


class NIS(BaseModel):
    charged: Optional[float] = None
    apolar: Optional[float] = None


class Prodigy(BaseModel):
    available: bool
    PS: Optional[float] = None
    delta_G: Optional[float] = None
    Kd: Optional[float] = None
    intermolecular_contacts: Optional[float] = None
    contacts: Contacts
    NIS: NIS
    note: str


class String(BaseModel):
    has_evidence: bool
    coexpression: Optional[float] = None
    experimental: Optional[float] = None
    curated_database: Optional[float] = None
    pubmed: Optional[float] = None
    dominant_channel: Optional[str] = None
    combined_score: Optional[float] = None
    SS: Optional[float] = None
    note: str


class Biology(BaseModel):
    BS: Optional[str] = None
    localization: Optional[str] = None
    surface_feasibility: Optional[str] = None
    conflict_flag: Optional[bool] = None
    uniprot_id: Optional[str] = None
    reason: Optional[str] = None


class Final(BaseModel):
    TPS: Optional[float] = None
    coverage: Optional[str] = None
    coverage_n: Optional[int] = None
    rank: Optional[int] = None
    preferred: bool
    BS_flag: Optional[str] = None
    exclusion_reason: Optional[str] = None
    interpretation: str


class Interaction(BaseModel):
    interaction_id: str
    target_no: int
    receptor: str
    candidate_protein: str
    group: str
    group_number: int
    structure: Structure
    alphafold: AlphaFold
    prodigy: Prodigy
    string: String
    biology: Biology
    final: Final
    provenance: dict[str, Any]


class InteractionSummary(BaseModel):
    interaction_id: str
    target_no: int
    receptor: str
    candidate_protein: str
    group: str
    AFS: Optional[float] = None
    PS: Optional[float] = None
    SS: Optional[float] = None
    TPS: Optional[float] = None
    coverage: Optional[str] = None
    rank: Optional[int] = None
    BS_flag: Optional[str] = None
    preferred: bool


class PaginatedInteractions(BaseModel):
    total: int
    limit: int
    offset: int
    count: int
    items: list[InteractionSummary]


class ReceptorSummary(BaseModel):
    receptor: str
    target_no: int
    n_candidates: int
    n_preferred: int
    top_candidate: Optional[str] = None
    top_TPS: Optional[float] = None


class CandidateSummary(BaseModel):
    candidate_protein: str
    BS_flag: Optional[str] = None
    n_pairs: int
    n_preferred: int
    median_TPS: Optional[float] = None
    max_TPS: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    interactions_loaded: int
    structures_available: int


class ErrorResponse(BaseModel):
    error: dict[str, Any]
