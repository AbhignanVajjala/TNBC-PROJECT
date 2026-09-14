# EXO-RANK — Architecture & System Diagrams

All diagrams are written in **Mermaid** so you can render them to images for a PPT.
Render options: paste into <https://mermaid.live>, GitHub markdown preview, VS Code (Mermaid
extension), Obsidian, or Notion. Top-level views also include an ASCII version.

---

## 0. Diagram inventory (scope)

| # | Diagram | Type | What it shows |
|---|---|---|---|
| 1 | System context | flowchart | User → Frontend → Backend → Data (bird's-eye) |
| 2 | Runtime/deployment topology | flowchart | Processes, ports, proxy, offline data |
| 3 | Scientific data pipeline | flowchart | Raw predictions → scoring scripts → outputs → PDBs |
| 4 | Scoring computation graph | flowchart | AFS / PS / SS / BS → Coverage → TPS |
| 5 | Scoring decision & shortlist | flowchart | Coverage ≥ 2/3 AND BS ≠ Low gating |
| 6 | Missing-data handling | flowchart | How null / renormalization works |
| 7 | Backend layered architecture | flowchart | routes → services → repository → loaders → data |
| 8 | Backend data model (interaction) | erDiagram | The normalized interaction entity + sources |
| 9 | Interaction-ID mapping | flowchart | Frontend ids ↔ backend Target No. + Protein |
| 10 | API endpoint map | flowchart | All REST endpoints |
| 11 | Sequence: load an interaction | sequenceDiagram | GET interaction end-to-end |
| 12 | Sequence: 3D PDB retrieval | sequenceDiagram | Viewer → proxy → FastAPI → PDB → 3Dmol |
| 13 | Frontend component tree | flowchart | App → views → viewer/panels |
| 14 | Screening funnel (science) | flowchart | 200-pair funnel |
| 15 | Frontend screen state machine | stateDiagram | selector ↔ analysis |
| 16 | Portable backend package | flowchart | Self-contained folder layout |

---

## 1. System context (bird's-eye)

```mermaid
flowchart LR
  U([Researcher / Judge]) --> FE["Frontend SPA<br/>React 19 + Vite + 3Dmol.js<br/>:3000"]
  FE -->|same-origin /api| EXP["Express server<br/>SPA host + API proxy"]
  EXP -->|/api/exorank/*| BE["Backend API<br/>FastAPI :8000"]
  BE --> DATA[("Portable data bundle<br/>CSV/XLSX + 200 PDBs<br/>backend/data")]
  EXP -.->|mock /api/targets, AI| MOCK["Local dataset + Gemini"]
```

**ASCII:**
```
Researcher
    |
    v
Frontend SPA (React + 3Dmol, :3000)
    |  same-origin /api
    v
Express server  --(/api/exorank/*)-->  FastAPI backend (:8000)
                                             |
                                             v
                               Portable data bundle (CSV/XLSX + 200 PDBs)
```

---

## 2. Runtime / deployment topology

```mermaid
flowchart TB
  subgraph Client[Browser]
    SPA["React SPA + 3Dmol.js viewer"]
  end
  subgraph Node[Node process :3000]
    EXPRESS["Express (server.ts)"]
    VITE["Vite middleware (dev) / static (prod)"]
    ROUTES["server/routes.ts<br/>mock data + /api/exorank proxy"]
  end
  subgraph Py[Python process :8000]
    FASTAPI["FastAPI (app.main)"]
    REPO["In-memory InteractionRepository"]
  end
  subgraph Disk[Local disk - offline]
    RAW[("data/raw/*.csv|xlsx")]
    PDB[("data/structures/*.pdb")]
    IDX[("data/processed/structure_index.csv")]
    MAN[("data/MANIFEST.json")]
  end
  SPA --> EXPRESS
  EXPRESS --> VITE
  EXPRESS --> ROUTES
  ROUTES -->|HTTP| FASTAPI
  FASTAPI --> REPO
  REPO --> RAW
  REPO --> IDX
  FASTAPI --> PDB
  REPO -. verifies .- MAN
```

---

## 3. Scientific data pipeline (raw → scores)

```mermaid
flowchart LR
  A1["AF2/ColabFold JSONs<br/>ipTM, pTM, PAE, pLDDT"] --> N
  A2["AF3 full_data + summary"] --> N
  A3["Rank-1 PDBs (chains)"] --> IPAE["interface PAE calc"]
  P1["PRODIGY text<br/>ΔG, contacts, NIS"] --> PS
  S1["STRING INFO.xlsx<br/>channels + combined"] --> SS
  B1["UniProt / CSPA / SURFY / Vesiclepedia"] --> BS
  N["Global min-max normalize"] --> AFS
  IPAE --> AFS
  AFS["AFS score"] --> OUT
  PS["PS score (winsorized ΔG)"] --> OUT
  SS["SS score (combined)"] --> OUT
  BS["BS flag High/Med/Low"] --> OUT
  OUT[("outputs/*.csv<br/>AFS,PS,SS,BS,TPS,coverage,rank")]
  A2 --> STR["full_pdbs/*.pdb (200)"]
  A1 --> STR
```

---

## 4. Scoring computation graph (the core formulas)

```mermaid
flowchart TD
  subgraph AF[AlphaFold to AFS]
    a1["ipTM_N"] --> AFS
    a2["pTM_N"] --> AFS
    a3["interface_PAE_N (inverted)"] --> AFS
    a4["mean_pLDDT_N"] --> AFS
    AFS["AFS = 0.50 ipTM + 0.20 pTM + 0.15 ifacePAE + 0.15 pLDDT"]
  end
  subgraph PR[PRODIGY to PS]
    p1["ΔG"] --> pw["winsorize 1-99% + min-max invert"] --> PS["PS"]
  end
  subgraph ST[STRING to SS]
    s1["combined score 0-1 (as-is)"] --> SS["SS"]
  end
  subgraph BIO[Biology to BS]
    b1["UniProt loc/topology + CSPA/SURFY"] --> BS["BS = High/Med/Low"]
  end
  AFS --> AVAIL
  PS --> AVAIL
  SS --> AVAIL
  AVAIL["available scores"] --> TPS["TPS = mean of available (equal 1/3)"]
  AVAIL --> COV["Coverage = n/3"]
  TPS --> RANK["Rank by TPS"]
  COV --> SHORT
  BS --> SHORT
  RANK --> SHORT["Preferred shortlist"]
```

---

## 5. Scoring decision & shortlist gating

```mermaid
flowchart TD
  START([Each of 200 pairs]) --> C{"Coverage >= 2/3 ?"}
  C -- No --> EX1["Excluded: insufficient evidence<br/>(reported, kept in full data)"]
  C -- Yes --> B{"BS != Low ?"}
  B -- No --> EX2["Excluded: low EV-surface feasibility"]
  B -- Yes --> IN["PREFERRED SHORTLIST (121)<br/>ranked by TPS"]
  IN --> T{"Robustness tier"}
  T --> T1["Tier 1: 3/3 cov, BS High, stable (5)"]
  T --> T2["Tier 2: 2/3 cov, BS High/Med (16)"]
  T --> T3["Tier 3: lower/weight-sensitive (100)"]
```

---

## 6. Missing-data handling

```mermaid
flowchart TD
  P([Pair]) --> H{Source present?}
  H -- AFS present (always) --> keepA[include AFS]
  H -- PS present? 151/200 --> dPS{present}
  H -- SS present? 64/200 --> dSS{present}
  dPS -- yes --> keepP[include PS]
  dPS -- no --> dropP["exclude from mean (NOT 0, NOT median)"]
  dSS -- yes --> keepS[include SS]
  dSS -- no --> dropS["exclude from mean (NOT 0, NOT median)"]
  keepA --> M["TPS = mean(available)"]
  keepP --> M
  keepS --> M
  dropP --> M
  dropS --> M
  M --> CV["Coverage flags how many were present"]
```

---

## 7. Backend layered architecture

```mermaid
flowchart TD
  subgraph API[app/api/routes]
    r1[health] 
    r2[system/status]
    r3[interactions]
    r4[structures]
    r5[receptors]
    r6[candidates]
    r7[shortlist]
  end
  subgraph SVC[app/services]
    s1[interaction_service]
    s2[structure_service]
    s3[aggregate_service]
  end
  subgraph DATA[app/data]
    repo["repositories/InteractionRepository<br/>(joins on Target No. + Protein)"]
    load["loaders/source_loader"]
  end
  subgraph CFG[app]
    cfg["config.py (paths from backend root)"]
    err["utils/errors.py (central error format)"]
    sch["api/schemas/models.py (Pydantic)"]
  end
  FILES[("data/raw + data/structures + structure_index + MANIFEST")]
  r3 --> s1 --> repo
  r4 --> s2 --> repo
  r5 --> s3 --> repo
  r6 --> s3
  r7 --> s3
  r2 --> repo
  repo --> load --> FILES
  s2 --> FILES
  cfg -.-> load
  cfg -.-> s2
  API --- sch
  API --- err
```

---

## 8. Backend data model — the normalized interaction

```mermaid
erDiagram
  INTERACTION {
    string interaction_id "T{target}_{PROTEIN} (PK)"
    int    target_no
    string receptor
    string candidate_protein
    string group "A or B"
  }
  ALPHAFOLD { float ipTM  float pTM  float mean_pLDDT  float interface_PAE  float AFS }
  PRODIGY   { float PS  float delta_G  int contacts  float NIS_apolar  float NIS_charged }
  STRING    { float SS  float combined  float experimental  float database  float pubmed  float coexpression }
  BIOLOGY   { string BS_flag  string localization  bool conflict_flag  string uniprot_id }
  STRUCTURE { bool pdb_available  string model_type  string pdb_file }
  FINAL     { float TPS  string coverage  int rank  bool preferred  string exclusion_reason }

  INTERACTION ||--|| ALPHAFOLD : has
  INTERACTION ||--o| PRODIGY   : "has (49 missing)"
  INTERACTION ||--o| STRING    : "has (136 missing)"
  INTERACTION ||--|| BIOLOGY   : has
  INTERACTION ||--|| STRUCTURE : has
  INTERACTION ||--|| FINAL     : has
```

---

## 9. Interaction-ID mapping (frontend ↔ backend)

```mermaid
flowchart LR
  subgraph FE[Frontend selection]
    rec["receptor.no = 1<br/>(e.g. TROP2)"]
    lig["ligand key = anxa2"]
  end
  rec --> ID
  lig --> ID
  ID["interaction_id = T{no}_{LIGAND.upper}<br/>= T1_ANXA2"]
  ID --> BE["Backend record<br/>Target No.=1 + Protein=ANXA2"]
  BE --> PDB["full_pdbs / structure_index<br/>-> the correct .pdb"]
```

---

## 10. API endpoint map

```mermaid
flowchart TD
  ROOT["/api"] --> H["/health"]
  ROOT --> SYS["/system/status"]
  ROOT --> INT["/interactions"]
  INT --> INTID["/interactions/{id}"]
  INTID --> SC["/scores"]
  INTID --> EV["/evidence"]
  INTID --> ST["/structure"]
  ST --> PDBEP["/structure/pdb"]
  ROOT --> REC["/receptors"]
  ROOT --> CAND["/candidates"]
  ROOT --> SL["/shortlist"]
  ROOT --> DOCS["/docs (Swagger), /openapi.json"]
```

---

## 11. Sequence — load a full interaction

```mermaid
sequenceDiagram
  participant UI as React (AnalysisView)
  participant EX as Express proxy
  participant API as FastAPI
  participant RP as Repository (in-memory)
  UI->>EX: GET /api/exorank/interaction/T1_ANXA2
  EX->>API: GET /api/interactions/T1_ANXA2
  API->>RP: get(T1_ANXA2)
  RP-->>API: joined record (AFS,PS,SS,BS,TPS,coverage,provenance)
  API-->>EX: 200 JSON
  EX-->>UI: 200 JSON
  UI->>UI: render scores + PRODIGY panel + badge
```

---

## 12. Sequence — 3D structure (PDB) retrieval for the viewer

```mermaid
sequenceDiagram
  participant V as 3Dmol viewer (AnalysisView)
  participant EX as Express proxy
  participant API as FastAPI
  participant FS as data/structures
  V->>EX: GET /api/exorank/structure/T1_ANXA2
  EX->>API: GET /api/interactions/T1_ANXA2/structure/pdb
  API->>API: resolve id -> whitelisted filename (structure_index)
  API->>FS: read the .pdb (path-traversal guarded)
  FS-->>API: PDB text
  API-->>EX: 200 chemical/x-pdb
  EX-->>V: PDB text
  V->>V: $3Dmol.addModel(pdb) -> chain A receptor, chain B candidate
```

---

## 13. Frontend component tree & data flow

```mermaid
flowchart TD
  APP["App.tsx (state: receptor, ligand, view)"] --> HDR[Header]
  APP --> SEL[TargetSelectorView]
  APP --> AN[AnalysisView]
  AN --> V3D["3Dmol viewer (#gmol-viewer)"]
  AN --> SCOR["Multi-layer scores panel"]
  AN --> PROD["PRODIGY contacts + NIS panel"]
  AN --> SEQ["Protein sequence panel (below viewer)"]
  AN --> BADGE["Live backend badge (TPS, BS, id)"]
  AN --> API["services/api.ts"]
  SEL --> API
  API -->|/api/exorank/*| PROXY[Express proxy] --> FASTAPI[FastAPI]
```

---

## 14. Screening funnel (science)

```mermaid
flowchart TD
  R["20 TNBC receptors"] --> ACC["extracellular / accessible domains"]
  ACC --> CAND["21 candidate exosomal proteins"]
  CAND --> GRP["Group A (selected) + Group B (controls)"]
  GRP --> PAIRS["200 receptor-protein pairs"]
  PAIRS --> STRcharts["AlphaFold structure -> AFS"]
  PAIRS --> AFF["PRODIGY affinity -> PS"]
  PAIRS --> EVID["STRING evidence -> SS"]
  PAIRS --> FEAS["Surface feasibility -> BS"]
  STRcharts --> TPS
  AFF --> TPS
  EVID --> TPS["Integrated TPS + Coverage"]
  FEAS --> FILTER
  TPS --> FILTER["Shortlist (121)"]
  FILTER --> PANEL["Experimental validation panel (10)"]
```

---

## 15. Frontend screen state machine

```mermaid
stateDiagram-v2
  [*] --> Selector
  Selector --> Analysis : inspect pair (receptor + ligand)
  Analysis --> Selector : back
  Selector --> Selector : change receptor / ligand (URL + localStorage sync)
  Analysis --> Analysis : change ligand -> refetch PDB + scores
```

---

## 16. Portable backend package layout

```mermaid
flowchart TD
  BK["backend/"] --> APP["app/ (main, config, api, services, data, utils)"]
  BK --> DATA["data/"]
  DATA --> RAW["raw/ (14 CSV/XLSX)"]
  DATA --> PROC["processed/structure_index.csv"]
  DATA --> STR["structures/ (200 .pdb)"]
  DATA --> MAN["MANIFEST.json (SHA-256)"]
  BK --> SCR["scripts/ (build_index, build_manifest, verify_data, setup)"]
  BK --> TST["tests/"]
  BK --> DOC["docs/API.md + README.md"]
  BK --> REQ["requirements.txt + .env.example"]
```

---

### Notes for slides
- Diagrams **1, 2, 4, 7** are the "must-have" architecture slides.
- Diagrams **3, 4, 5, 14** cover the scientific method; **8, 11, 12, 13** cover the software.
- Recolor in your renderer to the sage/forest + terracotta theme for consistency with the deck.
- To export: mermaid.live → "Actions → PNG/SVG", or the VS Code Mermaid extension → right-click → export.
```
