"""
Interface-PAE extraction for all 200 TNBC pairs (EXO-RANK). READ-ONLY on raw files.
Writes a NEW file outputs/interface_pae.csv. Modifies nothing existing.

Definition (coordinate-free):
  candidate chain = LAST chain (receptor first, candidate appended in every run).
  interface residue = any residue, scored by its MIN PAE to the OTHER partition
                      (candidate<->receptor; receptor-internal A-B excluded).
  interface_PAE      = mean over candidate+receptor residues of that per-residue min cross-PAE
  interface_PAE_block= mean of the whole candidate<->receptor PAE block (less discriminative)
  Lower = better interface positioning.

Run: python scoring/interface_pae.py
"""
import glob, json, os, re
import numpy as np
import pandas as pd

SHEET_FULL = pd.read_excel("outputs/ALPHAFOLD DATA.xlsx")
SHEET = SHEET_FULL[["Target No.", "Receptor", "Group", "Protein", "Median PAE"]]

# Authoritative (t,g) lookup by confidence triple — some raw AF2 filenames are mislabeled
# (e.g. '16test1_ff310' is truly pair (16,2)); the sheet is the source of truth.
_TRIPLE = {(round(r.ipTM, 4), round(r.pTM, 4), round(r["Median PAE"], 2)):
           (int(r["Target No."]), int(r.Group))
           for _, r in SHEET_FULL.iterrows()}
assert len(_TRIPLE) == len(SHEET_FULL), "confidence triple not unique — need finer key"


def true_tg(iptm, ptm, medpae):
    return _TRIPLE[(round(iptm, 4), round(ptm, 4), round(medpae, 2))]


def iface_metrics(pae, chain_of_residue):
    """chain_of_residue: array length N, chain label per PAE row (in matrix order).
    Candidate = last-appearing chain; receptor = the rest (grouped)."""
    order = list(dict.fromkeys(chain_of_residue))     # unique, first-seen order
    cand = order[-1]
    is_cand = np.array([c == cand for c in chain_of_residue])
    C = np.where(is_cand)[0]
    R = np.where(~is_cand)[0]
    block_CR = pae[np.ix_(C, R)]                       # candidate rows x receptor cols
    block_RC = pae[np.ix_(R, C)]
    # per-residue min to the other partition
    cand_min = block_CR.min(axis=1)                   # each candidate residue -> best receptor
    rec_min = block_RC.min(axis=1)                    # each receptor residue -> best candidate
    iface_min_mean = np.concatenate([cand_min, rec_min]).mean()
    iface_block_mean = np.concatenate([block_CR.ravel(), block_RC.ravel()]).mean()
    return iface_min_mean, iface_block_mean, len(order)


def af2_chain_array(pdb_path, n_expected):
    """Chain label per residue, in CA order (== PAE matrix order)."""
    chains = []
    for l in open(pdb_path):
        if l.startswith("ATOM") and l[12:16].strip() == "CA":
            chains.append(l[21])
    if len(chains) != n_expected:
        raise ValueError(f"{os.path.basename(pdb_path)}: {len(chains)} CA != pae {n_expected}")
    return chains


def main():
    rows = []
    # --- AF2 (extracted_jsons pae + extracted_pdbs chain order) ---
    # Raw filenames are inconsistent (doubled names, extra tokens, word group-names,
    # one mislabel, and colliding 5-hex hashes). Match json<->pdb robustly by the set of
    # {5-hex hash} and {pair token} present in each name: hash disambiguates pairs, pair
    # disambiguates hash collisions. json leading (t,g) is authoritative (keys the sheet).
    HEX = re.compile(r"^[0-9a-f]{5}$")
    PAIR = re.compile(r"^\d+test\d+$")
    def toks(name):
        return name.lower().split("_")
    pdb_index = []
    for p in glob.glob("extracted_pdbs/*.pdb"):
        tk = toks(os.path.basename(p))
        pdb_index.append((p, {x for x in tk if HEX.match(x)}, {x for x in tk if PAIR.match(x)}))

    def find_pdb(pairtok, jhash):
        c = [p for p, ph, pp in pdb_index if (jhash & ph) and (pairtok in pp)]
        if len(c) != 1:
            raise ValueError(f"{pairtok}/{jhash}: {len(c)} pdb matches")
        return c[0]

    for f in glob.glob("extracted_jsons/*.json"):
        tk = toks(os.path.basename(f))
        jhash = {x for x in tk if HEX.match(x)}
        pdb_path = find_pdb(tk[0], jhash)                # structure via filename (correct)
        d = json.load(open(f))
        pae = np.array(d["pae"], float)
        import statistics
        t, g = true_tg(d["iptm"], d["ptm"], statistics.median(pae.ravel()))  # (t,g) via value
        chain_of_res = af2_chain_array(pdb_path, pae.shape[0])
        imin, iblock, nch = iface_metrics(pae, chain_of_res)
        rows.append([t, g, "AF2", nch, imin, iblock])
    # --- AF3 (full_data pae + token_chain_ids) ---
    for f in glob.glob("AF3_rank_0_files/full_data/*.json"):
        m = re.match(r"fold_(\d+)_test_(\d+)", os.path.basename(f))
        t, g = int(m.group(1)), int(m.group(2))
        d = json.load(open(f))
        pae = np.array(d["pae"], float)
        imin, iblock, nch = iface_metrics(pae, list(d["token_chain_ids"]))
        rows.append([t, g, "AF3", nch, imin, iblock])

    df = pd.DataFrame(rows, columns=["Target No.", "Group", "af_source", "n_chains",
                                     "interface_PAE", "interface_PAE_block"])
    out = SHEET.merge(df, on=["Target No.", "Group"], how="left")
    assert out["interface_PAE"].notna().all(), "missing interface PAE for some pair"
    out = out[["Target No.", "Receptor", "Group", "Protein", "af_source", "n_chains",
               "Median PAE", "interface_PAE", "interface_PAE_block"]]
    out.to_csv("outputs/interface_pae.csv", index=False)
    print(f"Wrote outputs/interface_pae.csv ({len(out)} pairs; "
          f"AF2={ (out.af_source=='AF2').sum() }, AF3={ (out.af_source=='AF3').sum() }, "
          f"3-chain={ (out.n_chains>2).sum() })")


if __name__ == "__main__":
    main()
