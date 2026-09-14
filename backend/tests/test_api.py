"""EXO-RANK backend API tests. Run: pytest -q  (from backend/)"""
API = "/api"


def test_health(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["interactions_loaded"] == 200
    assert j["structures_available"] == 200


def test_system_status(client):
    j = client.get(f"{API}/system/status").json()
    assert j["status"] == "ok"
    assert j["data"]["interactions"] == 200
    assert j["data"]["pdb_files"] == 200
    assert j["data"]["structures_resolved"] == 200
    assert j["data"]["integrity"] == "verified"


def test_list_and_pagination(client):
    r = client.get(f"{API}/interactions?limit=10&offset=0")
    assert r.status_code == 200
    j = r.json()
    assert j["total"] == 200 and j["limit"] == 10 and j["count"] == 10
    r2 = client.get(f"{API}/interactions?limit=10&offset=10")
    assert r2.json()["items"][0]["interaction_id"] != j["items"][0]["interaction_id"]


def test_filter_receptor_and_candidate(client):
    r = client.get(f"{API}/interactions?candidate=ANXA2")
    j = r.json()
    assert j["total"] > 0
    assert all(i["candidate_protein"] == "ANXA2" for i in j["items"])
    r2 = client.get(f"{API}/interactions?receptor=CD44")
    assert all("CD44" in i["receptor"] for i in r2.json()["items"])


def test_filter_preferred_and_coverage(client):
    r = client.get(f"{API}/interactions?preferred=true&limit=500")
    j = r.json()
    assert j["total"] == 121                      # locked shortlist size
    assert all(i["preferred"] for i in j["items"])
    r2 = client.get(f"{API}/interactions?min_coverage=2&limit=500")
    assert r2.json()["total"] == 176


def test_invalid_query(client):
    assert client.get(f"{API}/interactions?sort_by=BADFIELD").status_code == 400
    assert client.get(f"{API}/interactions?limit=99999").status_code == 400


def test_get_interaction_join_correct(client):
    # Target No. + Protein join: αvβ3 (target 6) ~ MFGE8
    r = client.get(f"{API}/interactions/T6_MFGE8")
    assert r.status_code == 200
    j = r.json()
    assert j["target_no"] == 6
    assert j["candidate_protein"] == "MFGE8"
    assert "integrin" in j["receptor"].lower()
    assert j["alphafold"]["AFS"] is not None
    assert j["final"]["TPS"] is not None
    assert j["biology"]["BS"] == "High"
    assert j["structure"]["pdb_available"] is True


def test_missing_data_is_null_not_zero(client):
    # TROP2 (target 1) ~ ANXA2 has NO STRING evidence -> SS null, has_evidence false
    j = client.get(f"{API}/interactions/T1_ANXA2").json()
    assert j["string"]["has_evidence"] is False
    assert j["string"]["SS"] is None
    assert j["string"]["combined_score"] is None


def test_not_found(client):
    r = client.get(f"{API}/interactions/T999_NOPE")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_scores_and_evidence(client):
    s = client.get(f"{API}/interactions/T6_MFGE8/scores").json()
    assert s["AFS"]["value"] is not None and "source" in s["AFS"]
    assert s["TPS"]["value"] is not None
    e = client.get(f"{API}/interactions/T6_MFGE8/evidence").json()
    assert "prodigy" in e and "string" in e and "biology" in e
    assert "provenance" in e


def test_structure_meta_and_pdb(client):
    m = client.get(f"{API}/interactions/T6_MFGE8/structure").json()
    assert m["pdb_available"] is True
    assert m["model_type"]
    p = client.get(f"{API}/interactions/T6_MFGE8/structure/pdb")
    assert p.status_code == 200
    assert p.headers["content-type"].startswith("chemical/x-pdb")
    body = p.text
    assert ("ATOM" in body) or ("HEADER" in body)  # valid PDB content


def test_receptors_candidates_shortlist(client):
    assert len(client.get(f"{API}/receptors").json()) == 20
    assert len(client.get(f"{API}/candidates").json()) == 21
    sl = client.get(f"{API}/shortlist").json()
    assert sl["total"] == 121


def test_cors(client):
    r = client.get(f"{API}/health", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_e2e_real_interaction(client):
    """End-to-end: pick top shortlist pair, verify full payload + PDB."""
    top = client.get(f"{API}/shortlist?limit=1").json()["items"][0]
    iid = top["interaction_id"]
    full = client.get(f"{API}/interactions/{iid}").json()
    assert full["final"]["preferred"] is True
    assert full["alphafold"]["AFS"] is not None
    pdb = client.get(f"{API}/interactions/{iid}/structure/pdb")
    assert pdb.status_code == 200 and len(pdb.text) > 100
