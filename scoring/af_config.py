"""
AlphaFold normalization config — EXO-RANK.
Single source of truth for which features are normalized and how.
Dataset-specific decisions (documented, NOT universal AlphaFold rules).

Normalization: GLOBAL min-max across all valid ~200 receptor-protein pairs
(one comparable ranking across the whole dataset; NOT per-receptor).

  higher-is-better:  Xn = (X - Xmin) / (Xmax - Xmin)
  lower-is-better :  Xn = 1 - (X - Xmin) / (Xmax - Xmin)   # reversed

Xn = 1 -> best observed value in dataset; Xn = 0 -> worst observed.
"""

RAW_FILE  = "outputs/ALPHAFOLD DATA.xlsx"
SHEET     = "Sheet1"
OUT_FILE  = "outputs/alphafold_normalized.csv"

KEY_COLS = ["Target No.", "Receptor", "Group", "Protein"]

# raw column name -> (normalized column name, higher_is_better)
INCLUDED = {
    "ipTM":       ("ipTM_N",       True),
    "pTM":        ("pTM_N",        True),
    "Mean pLDDT": ("mean_pLDDT_N", True),
    "Median PAE": ("median_PAE_N", False),
}

# preserved raw, deliberately NOT normalized / NOT in the primary AFS
EXCLUDED = {
    "Mean PAE":           "Redundant with Median PAE (r~0.91 in this dataset) -> would double-count positional uncertainty. Median PAE kept as representative PAE feature.",
    "PAE Range(min-max)": "Near-constant in this dataset (~30.4-31, max PAE near model's confidence cap). Min-max on a narrow raw span would manufacture false 0-1 variation. Preserved raw, not normalized, no weight.",
    "Max PAE":            "Near-constant cap artifact; not part of the primary feature set.",
}
