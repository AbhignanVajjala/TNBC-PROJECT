# EXO-RANK — Relevance to the Problem & Future Scaling Roadmap

*How the prototype maps to the TNBC targeted-exosome problem, and a phased plan to scale it into a
self-improving discovery platform.*

---

## 1. How relevant is the prototype to the problem?

**The problem:** *Among ~200 TNBC receptor–exosomal-protein pairs, which should we validate
experimentally first?* The prototype answers exactly this — its design maps 1:1 to the need.

| Problem need | What the prototype delivers |
|---|---|
| Too many combinations to test blindly | A **ranked shortlist** (200 → 121 preferred) + a defensible 10-pair experimental panel |
| Need *converging* evidence, not one signal | Three independent layers (structure + energetics + prior biology) → one **TPS** |
| Not all pairs are equally trustworthy | **Coverage** flag (how many sources back each pair) |
| A ligand must physically reach the receptor | **BS feasibility filter** (removes cytosolic candidates, e.g. the glycolytic controls) |
| Scientists must see *why* a pair ranks high | A **frontend** showing the real predicted 3D complex (3Dmol), PRODIGY contacts, STRING evidence, and provenance per pair |
| Reproducibility / portability | A **self-contained FastAPI backend** (bundled data + 200 PDBs + hash-verified manifest) that runs offline on any machine |

**Honest scope.** It is a **decision-support / triage** tool: it *shrinks the search space and orders
it*; it does **not** prove binding. That is exactly the right claim — *"tell researchers which
candidates are worth validating first,"* not *"replace the wet lab."* So relevance is **high as a
prioritization platform** and appropriately modest scientifically.

**Where it is currently thin (and why scaling targets these):**
- SS (STRING) missing for 68% of pairs; PS (PRODIGY) missing for the 45 AF3 pairs → coverage gaps.
- Weights are **provisional** (no experimental labels to calibrate against).
- BS is UniProt-canonical (conservative for non-canonical EV-surface topology).

---

## 2. Future scaling roadmap

### Tier 1 — Complete & harden what exists (weeks)
1. **Fill evidence gaps:** collect STRING for all 200 pairs; run PRODIGY on the 45 AF3 structures → push coverage toward 3/3 everywhere (biggest immediate quality gain).
2. **Finish the BS layer properly:** pull CSPA / SURFY / Vesiclepedia programmatically (not just UniProt) and re-freeze the flag.
3. **Containerize + deploy:** Docker for backend + frontend (one-command spin-up); migrate the CSV layer to **SQLite/PostgreSQL** behind the existing repository interface so it scales past 200 rows.

### Tier 2 — Make the science stronger (months)
4. **External-benchmark calibration (the legitimate ML step — already designed):** calibrate the AlphaFold weights against **DockQ** on Docking Benchmark 5.5 using **Ridge / ElasticNet + MMseqs2 leave-cluster-out CV**. Replaces provisional weights with benchmark-grounded ones — uses *external* labels, not your unlabeled pairs, so it is scientifically sound. (Scaffolds exist in `scoring/af_benchmark_*`.)
5. **Upgrade interface features:** add **ipSAE / pDockQ2** (interface-specific confidence) alongside ipTM and interface PAE.
6. **Add a true 4th biological-evidence layer** from *independent* references (EV-surface proteomics, TNBC expression / DepMap) — carefully, to avoid the circularity we identified with BS.

### Tier 3 — Scale the search space & close the loop (high-value vision)
7. **Expand candidates & receptors:** from 21 hand-picked exosomal proteins to the **full exosomal / surfaceome space** (hundreds–thousands of pairs) via an automated **ColabFold/AF3 → PRODIGY → STRING → scoring batch pipeline** (the current `scoring/` scripts are the seed).
8. **Active-learning feedback loop:** as wet-lab results (SPR, pull-downs) return, they become the **first real labels** → supervised ML now becomes justified. Retrain/recalibrate on validated pairs so the platform **improves with every experiment** — turning a static ranking into a learning system. (Single biggest "make it more useful" step.)
9. **Generalize beyond TNBC:** the architecture (receptor panel × candidate panel → 4 layers → TPS) is disease-agnostic — swap the panels to target other cancers or delivery contexts.

### Tier 4 — Product polish
10. **Batch upload / lab-facing API**, saved shortlists, exportable validation dossiers, and (optional, clearly-labelled) **AI-assisted** mechanistic summaries — never claiming AI proves binding.

---

## 3. One-sentence roadmap
> **Short term:** complete the evidence (STRING/PRODIGY/BS) and containerize.
> **Medium term:** replace provisional weights with DockQ-benchmark calibration and add interface-specific metrics.
> **Long term:** automate the pipeline to screen the full exosomal proteome and close the loop with wet-lab results so the platform learns — turning EXO-RANK from a 200-pair prototype into a scalable, self-improving targeted-exosome discovery engine.

---

## 4. Suggested closing slides (for the deck)
- **Slide A — "Why it matters":** the relevance table (§1) — prototype ↔ problem mapping.
- **Slide B — "Honest scope":** triage/prioritization, not binding proof; current evidence gaps.
- **Slide C — "Roadmap":** the four tiers (§2) as a horizon chart (weeks → months → vision).
- **Slide D — "The vision":** the active-learning loop (wet-lab results → labels → recalibration → better rankings).

*Companion docs: EXO_RANK_SYSTEM_OVERVIEW.md, EXO_RANK_TECHNICAL_DOSSIER.md, EXO_RANK_DIAGRAMS.md,
EXO_RANK_MATH_AND_STATS.md, FINAL_EXO_RANK_RESULTS.md.*
