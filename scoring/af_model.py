"""
SCAFFOLD — calibrated AlphaFold Score model (EXO-RANK). DO NOT RUN YET.

Every function raises NotImplementedError until the methodology is approved.
No model is trained; no TNBC data is read or modified here.

Intended flow (after approval):
  benchmark features + DockQ  --standardize(train)-->  Ridge  -->  coeffs
  persist scaler + coeffs      -->  apply identical transform to TNBC raw features
  AFS_calibrated(TNBC) = model.predict(standardized TNBC features)
"""
import af_benchmark_config as cfg


def load_benchmark_features():
    """Return (X_raw[df], dockq[series], cluster_id[series]) for the benchmark.
    X columns = list(cfg.FEATURES). interface_PAE computed via interface_pae.py."""
    raise NotImplementedError("Approve methodology first (af_benchmark_research.md).")


def fit_scaler(X_train):
    """Fit StandardScaler on TRAIN ONLY; persist mean/std to cfg.PATHS['scaler_out'].
    Section 10: this scaler — not TNBC min-max — is later applied to TNBC."""
    raise NotImplementedError


def fit_model(Xz_train, y_train, model=cfg.MODEL["primary"]):
    """Ridge (primary) / ElasticNet (secondary) on standardized features."""
    raise NotImplementedError


def coeffs_to_weights(standardized_coeffs):
    """Interpretable weights: normalize POSITIVE standardized coefficients to sum 1.
    NOT abs(raw beta). Flag any negative (direction-violating) coefficient for review."""
    raise NotImplementedError


def apply_to_tnbc():
    """Read TNBC RAW features (READ ONLY), apply persisted scaler + model -> AFS_calibrated.
    Writes to a NEW file; never overwrites outputs/ALPHAFOLD DATA.xlsx or *_normalized.csv."""
    raise NotImplementedError


if __name__ == "__main__":
    raise SystemExit("SCAFFOLD ONLY — training is gated on methodology approval.")
