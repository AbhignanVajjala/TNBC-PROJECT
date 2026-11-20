"""Read-only UI evidence snapshot. Run with the backend virtual environment."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.data.repositories.interaction_repository import get_repository


def snapshot():
    sources = sorted((ROOT / "data/raw").glob("*")) + [ROOT / "data/processed/structure_index.csv"]
    return {
        "description": "Repository evidence snapshot; locked pipeline values, not experimental binding.",
        "sources": {str(p.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in sources if p.is_file()},
        "interactions": {r["interaction_id"]: r for r in get_repository().all()},
    }


if __name__ == "__main__":
    data = snapshot()
    dest = ROOT.parent / "frontend/src/data/evidence.json"
    dest.write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Exported {len(data['interactions'])} unchanged records to {dest.name}")
