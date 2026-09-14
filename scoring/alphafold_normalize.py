"""
AlphaFold feature normalization (EXO-RANK, independent module).
Reads the RAW spreadsheet read-only; writes a processed COPY with _N columns.
Never overwrites raw. No AFS, no weights, no PRODIGY/STRING here.

Run:  python scoring/alphafold_normalize.py
"""
import sys, pandas as pd
import af_config as cfg


def minmax(s, higher_is_better):
    lo, hi = s.min(), s.max()
    if lo == hi:  # rule 10: never divide by zero
        raise SystemExit(f"STOP: feature '{s.name}' has identical min==max ({lo}); "
                         f"cannot normalize. Review required.")
    z = (s - lo) / (hi - lo)
    return (z if higher_is_better else 1 - z), lo, hi


def main():
    df = pd.read_excel(cfg.RAW_FILE, sheet_name=cfg.SHEET)
    df = df.dropna(how="all").reset_index(drop=True)   # drop only fully-empty rows
    n = len(df)

    # --- QC before touching anything ---
    dups = df.duplicated(subset=["Target No.", "Group"]).sum()
    report = {"rows": n, "duplicate_pairs": int(dups), "features": {}}
    if dups:
        print(f"WARNING: {dups} duplicate (Target No., Group) pairs")

    for raw_col, (norm_col, higher) in cfg.INCLUDED.items():
        col = pd.to_numeric(df[raw_col], errors="coerce")  # non-numeric -> NaN
        bad = int((col.isna() & df[raw_col].notna()).sum())
        na  = int(df[raw_col].isna().sum())
        if bad:
            raise SystemExit(f"STOP: '{raw_col}' has {bad} non-numeric value(s). Review required.")

        norm, lo, hi = minmax(col, higher)   # NaN stays NaN (rule 4/5)
        df[norm_col] = norm                  # NEW column, raw untouched (rule 1/2)

        valid = norm.dropna()
        assert ((valid >= -1e-9) & (valid <= 1 + 1e-9)).all(), f"{norm_col} out of [0,1]"
        report["features"][raw_col] = {
            "norm_col": norm_col, "direction": "higher" if higher else "lower",
            "valid": int(col.notna().sum()), "na": na,
            "raw_min": float(lo), "raw_max": float(hi),
            "norm_min": float(valid.min()), "norm_max": float(valid.max()),
            "norm_na": int(norm.isna().sum()),
        }

    df.to_csv(cfg.OUT_FILE, index=False)

    # --- validation report ---
    print(f"\n=== AlphaFold normalization report ===")
    print(f"Pairs (rows)          : {report['rows']}")
    print(f"Duplicate (T,G) pairs : {report['duplicate_pairs']}")
    print(f"Normalization         : GLOBAL min-max across all {n} pairs (not per-receptor)")
    print(f"Raw file (untouched)  : {cfg.RAW_FILE}")
    print(f"Processed copy written: {cfg.OUT_FILE}")
    print(f"{'feature':12s} {'dir':6s} {'valid':>5s} {'NA':>3s} {'raw_min':>9s} {'raw_max':>9s} {'N_min':>6s} {'N_max':>6s}")
    for f, d in report["features"].items():
        print(f"{f:12s} {d['direction']:6s} {d['valid']:5d} {d['na']:3d} "
              f"{d['raw_min']:9.4f} {d['raw_max']:9.4f} {d['norm_min']:6.3f} {d['norm_max']:6.3f}")
    print(f"\nExcluded (raw preserved, NOT normalized): {', '.join(cfg.EXCLUDED)}")
    print("Raw values preserved: YES (only *_N columns added)")


if __name__ == "__main__":
    sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
    main()
