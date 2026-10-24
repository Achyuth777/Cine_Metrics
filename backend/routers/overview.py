"""
Overview Router
================
Provides the /api/overview endpoint that returns global dashboard statistics.
This is the primary summary call made by the frontend to populate key metric cards.
"""

import logging
import os

from fastapi import APIRouter

import data_loader
from config import settings
from models import OverviewResponse, DatasetInfo, HighestRatedMovie

logger = logging.getLogger("cinemetrics.routers.overview")

router = APIRouter(prefix="/api", tags=["Overview"])


@router.get("/overview", response_model=OverviewResponse)
async def get_overview():
    """
    Return global dashboard statistics with engine provenance.
    """
    stats = data_loader.global_stats

    # Find the highest-rated movie with enough ratings to be meaningful
    highest_rated = data_loader.get_highest_rated_movie(min_ratings=10)
    highest_rated_model = None
    if highest_rated:
        highest_rated_model = HighestRatedMovie(**highest_rated)

    total_records = stats.get("totalRatings", 0)

    dataset_info = DatasetInfo(
        name=settings.DATASET_NAME,
        version=settings.DATASET_VERSION,
        source=settings.DATASET_SOURCE,
        records=total_records,
        movies=stats.get("totalMovies", 0),
        users=stats.get("uniqueUsers", 0),
        license="GroupLens Research / Non-commercial academic research",
        files=_get_file_info(),
    )

    engine = data_loader.provenance_info.get("engine", "python-reference")
    processed_at = data_loader.provenance_info.get("processedAt") or data_loader.last_loaded or "unknown"
    api_loaded_at = data_loader.provenance_info.get("apiLoadedAt") or data_loader.last_loaded

    return OverviewResponse(
        totalMovies=stats["totalMovies"],
        totalRatings=stats["totalRatings"],
        uniqueUsers=stats["uniqueUsers"],
        globalAverageRating=stats["globalAverageRating"],
        genreCount=stats["genreCount"],
        highestRatedMovie=highest_rated_model,
        datasetInfo=dataset_info,
        engine=engine,
        lastProcessed=processed_at,
        apiLoadedAt=api_loaded_at,
    )


def _get_file_info() -> list:
    """
    Gather size information for raw dataset files.
    """
    files = []
    raw_dir = settings.RAW_DATA_DIR
    if not raw_dir.exists():
        return files

    for f in sorted(raw_dir.iterdir()):
        if f.is_file() and f.suffix == ".csv":
            size_bytes = f.stat().st_size
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"

            files.append({"name": f.name, "size": size_str, "bytes": size_bytes})

    return files
