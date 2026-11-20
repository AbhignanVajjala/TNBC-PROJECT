"""Manifest checks tolerate only Git's CRLF expansion when LF bytes match exactly.

Never alter source files or regenerate the manifest to conceal a mismatch.
"""
import hashlib
import json
from functools import lru_cache
from pathlib import Path


def verify_entry(path: Path, entry: dict) -> str:
    if not path.is_file():
        return "missing"
    data = path.read_bytes()
    def matches(content):
        return len(content) == entry["size_bytes"] and hashlib.sha256(content).hexdigest() == entry["sha256"]
    if matches(data):
        return "exact"
    if path.suffix.lower() == ".pdb" and b"\r\n" in data and matches(data.replace(b"\r\n", b"\n")):
        return "crlf_normalized"
    return "mismatch"


@lru_cache(maxsize=1)
def _check(manifest_path: str, root_path: str, signature: tuple):
    entries = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    results = [verify_entry(Path(root_path) / e["file"], e) for e in entries["data_files"] + entries["structures"]]
    return {"integrity": "verified" if all(r in ("exact", "crlf_normalized") for r in results) else "failed",
            "line_endings_normalized": results.count("crlf_normalized")}


def manifest_integrity(manifest: Path, root: Path):
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        files = [manifest] + [root / e["file"] for e in data["data_files"] + data["structures"]]
        signature = tuple((p.stat().st_mtime_ns, p.stat().st_size) if p.is_file() else None for p in files)
        return _check(str(manifest), str(root), signature)
    except (OSError, ValueError, KeyError):
        return {"integrity": "manifest_unreadable", "line_endings_normalized": 0}
