from fastapi import APIRouter
from fastapi.responses import FileResponse, PlainTextResponse
from app.services import structure_service as svc
from app.utils.errors import APIError

router = APIRouter(prefix="/interactions", tags=["structures"])


@router.get("/{interaction_id}/structure")
def get_structure_meta(interaction_id: str):
    meta = svc.structure_meta(interaction_id)
    if meta is None:
        raise APIError(404, "not_found", f"Interaction '{interaction_id}' not found.")
    return meta


@router.get("/{interaction_id}/structure/pdb",
            responses={200: {"content": {"chemical/x-pdb": {}}}})
def get_structure_pdb(interaction_id: str, download: bool = False):
    """Raw PDB for molecular viewers (Mol*/3Dmol.js/NGL). `?download=true` forces attachment."""
    meta = svc.structure_meta(interaction_id)
    if meta is None:
        raise APIError(404, "not_found", f"Interaction '{interaction_id}' not found.")
    path = svc.resolve_pdb_path(interaction_id)
    if path is None:
        raise APIError(404, "structure_unavailable",
                       f"No structure file available for '{interaction_id}'.")
    filename = f"{interaction_id}.pdb"
    disposition = "attachment" if download else "inline"
    return FileResponse(path, media_type="chemical/x-pdb", filename=filename,
                        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'})
