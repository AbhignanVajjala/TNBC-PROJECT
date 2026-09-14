"""
SCAFFOLD — validation & baselines for calibrated AFS (EXO-RANK). DO NOT RUN YET.
Raises NotImplementedError until methodology is approved. Trains/evaluates nothing now.
"""
import af_benchmark_config as cfg


def cluster_split(sequences):
    """MMseqs2 30% identity / 90% coverage clusters -> leave-cluster-out CV folds.
    Ensures no homolog shares train+validation (Section 7)."""
    raise NotImplementedError("Approve methodology first.")


def evaluate_continuous(y_true, y_pred):
    """Return {spearman, pearson, rmse, mae}."""
    raise NotImplementedError


def evaluate_binary(y_true, y_prob, thr=cfg.TARGET["acceptable_threshold"]):
    """Acceptable = DockQ>=0.23. Return {auroc, auprc}."""
    raise NotImplementedError


def run_baselines(features_df, dockq):
    """Compare: ipTM-only, 0.8ipTM+0.2pTM, pDockQ, pDockQ2, learned model
    on the SAME leave-cluster-out folds (Section 8)."""
    raise NotImplementedError


def run_ablation(features_df, dockq):
    """Nested feature sets (Section 9): does each feature add predictive info?"""
    raise NotImplementedError


if __name__ == "__main__":
    raise SystemExit("SCAFFOLD ONLY — validation is gated on methodology approval.")
