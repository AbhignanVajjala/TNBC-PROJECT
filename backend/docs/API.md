# EXO-RANK API Contract

Base URL: `http://{host}:{port}/api` · Interactive docs: `/api/docs` (Swagger), `/api/redoc`.
All responses are JSON. All errors use `{"error": {"code","message","details"}}`.
Interaction id format: `T{target_no}_{PROTEIN}` (e.g. `T6_MFGE8`). Join key = Target No. + Protein.

## Status codes
`200` ok · `400` invalid query · `404` not found · `500` unexpected error.

---

## GET /health
```json
{ "status":"ok","app":"EXO-RANK API","version":"1.0.0",
  "interactions_loaded":200,"structures_available":200 }
```

## GET /system/status
```json
{ "status":"ok","api":{"name":"EXO-RANK API","version":"1.0.0"},
  "data":{ "data_dir_available":true,"structures_dir_available":true,
    "interactions":200,"pdb_files":200,"structures_resolved":200,
    "manifest_present":true,"integrity":"verified",
    "database":"not used (CSV-backed, in-memory)" } }
```

## GET /interactions
Query params: `receptor` (substring), `candidate` (exact gene symbol), `group` (A|B),
`bs` (High|Medium|Low), `preferred` (bool), `min_coverage` (1–3),
`sort_by` (TPS|AFS|PS|SS|coverage|rank|receptor|candidate|group|BS), `order` (asc|desc),
`limit` (1–500, default 50), `offset` (default 0).
```json
{ "total":121,"limit":5,"offset":0,"count":5,
  "items":[ { "interaction_id":"T6_MFGE8","target_no":6,
    "receptor":"αvβ3 integrin / ITGAV–ITGB3","candidate_protein":"MFGE8","group":"A",
    "AFS":0.6206,"PS":null,"SS":0.985,"TPS":0.8028,"coverage":"2/3","rank":1,
    "BS_flag":"High","preferred":true } ] }
```

## GET /interactions/{id}
Full record (missing numeric data = `null`, never 0):
```json
{
  "interaction_id":"T6_MFGE8","target_no":6,
  "receptor":"αvβ3 integrin / ITGAV–ITGB3","candidate_protein":"MFGE8",
  "group":"A","group_number":2,
  "structure":{ "pdb_available":true,"pdb_file":"fold_6_test_2_model_0.pdb",
    "pdb_download_url":"/api/interactions/T6_MFGE8/structure/pdb",
    "structure_source":"AlphaFold3","model_type":"alphafold3","format":"pdb" },
  "alphafold":{ "ipTM":0.61,"pTM":null,"mean_pLDDT":...,"mean_PAE":...,"median_PAE":...,
    "max_PAE":...,"PAE_range":"...","interface_PAE":28.55,"af_source":"AF3","AFS":0.6206 },
  "prodigy":{ "available":false,"PS":null,"delta_G":null,"Kd":null,
    "intermolecular_contacts":null,
    "contacts":{ "charged_charged":null,"charged_polar":null,"charged_apolar":null,
      "polar_polar":null,"apolar_polar":null,"apolar_apolar":null },
    "NIS":{ "charged":null,"apolar":null },
    "note":"Predicted energetic favorability (winsorized ΔG); not experimental affinity." },
  "string":{ "has_evidence":true,"coexpression":...,"experimental":...,"curated_database":...,
    "pubmed":...,"dominant_channel":"text","combined_score":0.985,"SS":0.985,
    "note":"Prior biological/network association evidence (text-mining-dominated); not experimental confirmation." },
  "biology":{ "BS":"High","localization":"Membrane ; Peripheral membrane protein ...",
    "surface_feasibility":"signal-peptide,secreted/ECM","conflict_flag":true,
    "uniprot_id":"Q08431","reason":"..." },
  "final":{ "TPS":0.8028,"coverage":"2/3","coverage_n":2,"rank":1,"preferred":true,
    "BS_flag":"High","exclusion_reason":null,
    "interpretation":"Computationally prioritized candidate for experimental validation." },
  "provenance":{ "structure":"structure_index.csv",
    "alphafold":["ALPHAFOLD DATA.xlsx","interface_pae.csv","final_score_calculation.csv"],
    "prodigy":["PRODIGY INFO.xlsx","prodig_v1_parsed.xlsx","final_score_calculation.csv"],
    "string":"string_score.csv","biology":"biological_feasibility_score.csv",
    "final":"final_score_calculation.csv" }
}
```
`404` if id unknown.

## GET /interactions/{id}/scores
```json
{ "interaction_id":"T6_MFGE8",
  "AFS":{"value":0.6206,"source":"final_score_calculation.csv"},
  "PS":{"value":null,"source":"final_score_calculation.csv (winsorized ΔG)"},
  "SS":{"value":0.985,"source":"string_score.csv (STRING combined)"},
  "TPS":{"value":0.8028,"source":"mean of available {AFS,PS,SS}"},
  "coverage":"2/3","coverage_n":2,"rank":1,"preferred":true,"BS_flag":"High",
  "exclusion_reason":null,
  "interpretation":"Computationally prioritized candidate for experimental validation." }
```

## GET /interactions/{id}/evidence
Returns `prodigy`, `string`, `biology` blocks (as above) + `provenance`.

## GET /interactions/{id}/structure
```json
{ "pdb_available":true,"pdb_file":"fold_6_test_2_model_0.pdb",
  "pdb_download_url":"/api/interactions/T6_MFGE8/structure/pdb",
  "structure_source":"AlphaFold3","model_type":"alphafold3","format":"pdb",
  "interaction_id":"T6_MFGE8","receptor":"αvβ3 integrin / ITGAV–ITGB3",
  "candidate_protein":"MFGE8",
  "viewer_hint":"Serve /structure/pdb to Mol*/3Dmol.js/NGL; chain A = receptor, chain B = candidate ..." }
```

## GET /interactions/{id}/structure/pdb
Raw PDB text, media type `chemical/x-pdb`. `?download=true` forces attachment.
Only the whitelisted file from the structure index is served (no path traversal). `404` if unavailable.

## GET /receptors
```json
[ { "receptor":"αvβ3 integrin / ITGAV–ITGB3","target_no":6,
    "n_candidates":10,"n_preferred":6,"top_candidate":"MFGE8","top_TPS":0.8028 } ]
```

## GET /candidates
```json
[ { "candidate_protein":"FN1","BS_flag":"High","n_pairs":20,"n_preferred":18,
    "median_TPS":0.34,"max_TPS":0.708 } ]
```

## GET /shortlist  (`?limit=&offset=`)
Preferred shortlist (coverage ≥ 2/3 AND BS ≠ Low), ranked by TPS.
```json
{ "total":121,"limit":200,"offset":0,"count":121,
  "criterion":"coverage >= 2/3 AND BS != Low",
  "items":[ { "interaction_id":"T6_MFGE8","receptor":"αvβ3 integrin / ITGAV–ITGB3",
    "candidate_protein":"MFGE8","group":"A","TPS":0.8028,"coverage":"2/3",
    "BS_flag":"High","rank":1 } ] }
```

## Error example
```json
{ "error":{ "code":"not_found","message":"Interaction 'T999_NOPE' not found.","details":null } }
```
