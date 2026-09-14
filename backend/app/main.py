"""EXO-RANK backend API entrypoint.

Run: uvicorn app.main:app --reload   (from the backend/ directory)

A computational PRIORITIZATION backend for TNBC targeted-exosome screening.
It exposes structural + scoring evidence per receptor-candidate pair. It does NOT
claim experimental binding: AlphaFold = structural confidence, PRODIGY = predicted
energetics, STRING = prior association evidence, TPS = integrated priority.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.utils.errors import register_error_handlers
from app.data.repositories.interaction_repository import get_repository
from app.api.routes import (health, interactions, structures, receptors,
                            candidates, shortlist, system)

S = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_repository()          # load & normalize all interactions at startup
    yield


app = FastAPI(
    title=S.app_name,
    version=S.app_version,
    description="TNBC EXO-RANK — computational prioritization API. "
                "Predictions are candidates for experimental validation, not confirmed interactions.",
    lifespan=lifespan,
    openapi_url=f"{S.api_prefix}/openapi.json",
    docs_url=f"{S.api_prefix}/docs",
    redoc_url=f"{S.api_prefix}/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=S.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

register_error_handlers(app)

for r in (health, system, interactions, structures, receptors, candidates, shortlist):
    app.include_router(r.router, prefix=S.api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return {"app": S.app_name, "version": S.app_version, "docs": f"{S.api_prefix}/docs"}
