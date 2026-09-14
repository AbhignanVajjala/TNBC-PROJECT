"""
Configuration scaffold for EXTERNAL AlphaFold-Score calibration (EXO-RANK).
CONFIG ONLY — nothing here trains a model or touches TNBC data.

Decisions are documented in scoring/af_benchmark_research.md.
Nothing runs until the methodology is approved.
"""

# ----------------------------------------------------------------------
# BENCHMARK
# ----------------------------------------------------------------------
BENCHMARK = {
    "primary":  "Docking Benchmark 5.5 (heterodimers subset)",   # Vreven 2015 / Guest 2021
    "backup":   "Yin & Pierce 2023 AF-Multimer evaluation set (predictions+DockQ already published)",
    "exclude":  ["antibody-antigen"],   # different interface biology; optional separate model
    "prefer":   "hetero-dimeric, non-antibody, extracellular/soluble where possible",
}

# ----------------------------------------------------------------------
# TARGET
# ----------------------------------------------------------------------
TARGET = {
    "name": "DockQ",                 # structural interface quality vs experimental reference
    "mode": "continuous",            # primary: regression on DockQ
    "secondary_mode": "binary",      # acceptable interface = DockQ >= 0.23 (CAPRI)
    "acceptable_threshold": 0.23,    # Basu & Wallner 2016
    "NOT": "binding affinity",       # DockQ is model quality, NOT experimental Kd/dG
}

# ----------------------------------------------------------------------
# FEATURES  (small, interpretable set; interface PAE replaces whole-complex PAE)
# ----------------------------------------------------------------------
FEATURES = {
    "ipTM":          {"source": "AF2/ColabFold json", "direction": "higher"},
    "pTM":           {"source": "AF2/ColabFold json", "direction": "higher"},
    "interface_PAE": {"source": "computed from pae + chain boundary", "direction": "lower",
                      "definition": "mean of per-interface-residue minimum cross-chain PAE"},
    "mean_pLDDT":    {"source": "AF2/ColabFold json", "direction": "higher"},
}
# candidate ablation order (Section 9)
ABLATION = [["ipTM"],
            ["ipTM", "pTM"],
            ["ipTM", "pTM", "interface_PAE"],
            ["ipTM", "pTM", "interface_PAE", "mean_pLDDT"]]

# ----------------------------------------------------------------------
# ALPHAFOLD VERSION  — match the TNBC data (majority AF2/ColabFold)
# ----------------------------------------------------------------------
AF_VERSION = "AF2/ColabFold (alphafold2_multimer_v3)"   # do NOT mix AF2/AF3 confidence metrics

# ----------------------------------------------------------------------
# MODEL
# ----------------------------------------------------------------------
MODEL = {
    "primary":   "Ridge",            # handles pTM/PAE collinearity, keeps all features
    "secondary": "ElasticNet",       # sensitivity check under sparsity
    "standardize": True,             # z-score on TRAIN only; persist mean/std
    "weights_from_coeffs": "normalize POSITIVE standardized coefficients to sum 1; "
                           "NOT abs(raw beta). Report as 'relative importance', keep sign check.",
}

# ----------------------------------------------------------------------
# VALIDATION / LEAKAGE
# ----------------------------------------------------------------------
VALIDATION = {
    "split": "leave-cluster-out CV",
    "clustering": "MMseqs2, 30% sequence identity, 90% coverage",   # AF2-style redundancy control
    "why": "prevent homologous complexes appearing in both train and validation",
    "metrics_continuous": ["spearman", "pearson", "rmse", "mae"],
    "metrics_binary":     ["auroc", "auprc"],
}

# ----------------------------------------------------------------------
# BASELINES  (Section 8)
# ----------------------------------------------------------------------
BASELINES = {
    "iptm_only":      lambda f: f["ipTM"],
    "af_multimer":    lambda f: 0.8 * f["ipTM"] + 0.2 * f["pTM"],   # Evans 2022
    "pdockq":         "Bryant 2022 (if reference interface available)",
    "pdockq2":        "Zhu 2023 (uses inter-chain PAE)",
    "learned":        "calibrated Ridge model",
}

# ----------------------------------------------------------------------
# FEATURE SCALING / TRANSFER  (Section 10 — critical)
# ----------------------------------------------------------------------
SCALING_TRANSFER = (
    "Fit StandardScaler on the BENCHMARK training features only; PERSIST mean/std. "
    "Apply the SAME persisted scaler to TNBC RAW AlphaFold features (ipTM, pTM, "
    "interface_PAE, mean_pLDDT). Do NOT reuse the TNBC within-200 global min-max "
    "(outputs/alphafold_normalized.csv) for the calibrated model — that scaling is "
    "dataset-internal and non-transferable. The provisional AFS keeps its own _N columns."
)

# paths (read-only intent; outputs go to a NEW namespace, never overwriting existing)
PATHS = {
    "benchmark_dir": "benchmark/",                 # to be created when approved
    "scaler_out":    "benchmark/af_scaler.json",
    "model_out":     "benchmark/af_calibrated_model.json",
    "tnbc_raw":      "outputs/ALPHAFOLD DATA.xlsx",  # READ ONLY, never modified
}
