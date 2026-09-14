"""Centralized configuration. ALL paths resolve from the backend root (programmatically,
via pathlib) so the folder is portable — copy backend/ anywhere and it still works.
No references outside backend/. No machine-specific absolute paths."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> parents[1] == backend/  (independent of cwd)
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_ROOT = BACKEND_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), extra="ignore")

    app_name: str = "EXO-RANK API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"

    # CORS: comma-separated allowed frontend origins
    frontend_url: str = "http://localhost:3000,http://localhost:5173"

    # Bundled, self-contained data locations (all inside backend/data/).
    # Override with absolute paths via env only if you deliberately move the data.
    data_dir: Path = DATA_ROOT / "raw"                 # immutable scientific source files
    pdb_dir: Path = DATA_ROOT / "structures"           # bundled PDB structures
    structure_index: Path = DATA_ROOT / "processed" / "structure_index.csv"
    manifest: Path = DATA_ROOT / "MANIFEST.json"

    host: str = "127.0.0.1"
    port: int = 8000

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_url.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
