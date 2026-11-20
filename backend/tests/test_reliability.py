import csv
import hashlib
import json
import math
from pathlib import Path
import pytest
from app.config import get_settings
from app.services.structure_service import resolve_pdb_path
from app.data.repositories.interaction_repository import get_repository
from app.utils.integrity import verify_entry, manifest_integrity

S = get_settings()


def test_every_indexed_structure_resolves_to_its_exact_pair():
    rows = list(csv.DictReader(S.structure_index.open(encoding="utf-8")))
    assert len(rows) == 200
    assert len({r["structure_filename"] for r in rows}) == 200
    assert len(list(S.pdb_dir.glob("*.pdb"))) == 200
    for row in rows:
        record = get_repository().get(row["interaction_id"])
        assert record["target_no"] == int(row["target_no"])
        assert record["candidate_protein"] == row["protein"]
        assert record["receptor"] == row["receptor"]
        assert resolve_pdb_path(row["interaction_id"]).name == row["structure_filename"]


def test_all_structures_have_finite_fixed_column_coordinates():
    models = {}
    for record in get_repository().all():
        lines = resolve_pdb_path(record["interaction_id"]).read_text().splitlines()
        chains, count = set(), 0
        for line in lines:
            if line.startswith("ENDMDL"):
                break
            if line.startswith(("ATOM  ", "HETATM")):
                assert all(math.isfinite(float(line[start:start + 8])) for start in (30, 38, 46))
                chains.add(line[21])
                count += 1
        assert count > 0
        assert {"A", "B"} <= chains  # additional chains are preserved, identities remain unverified
        model = record["structure"]["model_type"]
        models[model] = models.get(model, 0) + 1
    assert models == {"alphafold2_multimer_v3": 155, "alphafold3": 45}


@pytest.mark.parametrize("model", ["alphafold2_multimer_v3", "alphafold3"])
def test_each_model_type_is_retrievable_with_correct_content_type(client, model):
    record = next(r for r in get_repository().all() if r["structure"]["model_type"] == model)
    response = client.get(f"/api/interactions/{record['interaction_id']}/structure/pdb")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("chemical/x-pdb")
    assert any(line.startswith("ATOM  ") for line in response.text.splitlines())


def test_missing_structure_reports_unavailable(client, monkeypatch, tmp_path):
    from app.services import structure_service
    monkeypatch.setattr(structure_service.S, "pdb_dir", tmp_path)
    meta = client.get("/api/interactions/T1_ANXA2/structure").json()
    assert meta["pdb_available"] is False
    assert client.get("/api/interactions/T1_ANXA2/structure/pdb").status_code == 404


def test_frontend_snapshot_equals_current_backend_records_and_source_hashes():
    from scripts.export_frontend_evidence import snapshot
    actual = json.loads((Path(__file__).resolve().parents[2] / "frontend/src/data/evidence.json").read_text(encoding="utf-8"))
    assert actual == snapshot()


def test_manifest_crlf_tolerance_does_not_hide_coordinate_changes(tmp_path):
    original = b"ATOM coordinates\nEND\n"
    entry = {"size_bytes": len(original), "sha256": hashlib.sha256(original).hexdigest()}
    path = tmp_path / "test.pdb"
    path.write_bytes(original)
    assert verify_entry(path, entry) == "exact"
    path.write_bytes(original.replace(b"\n", b"\r\n"))
    assert verify_entry(path, entry) == "crlf_normalized"
    path.write_bytes(original.replace(b"coordinates", b"alterations"))
    assert verify_entry(path, entry) == "mismatch"
    assert manifest_integrity(S.manifest, S.data_dir.parent)["integrity"] == "verified"
