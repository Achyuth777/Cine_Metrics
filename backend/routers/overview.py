"""
Overview Router
================
Provides the /api/overview endpoint that returns global dashboard statistics.
This is typically the first API call made by the frontend to populate the
main dashboard cards and summary information.
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
    Return global dashboard statistics.

    Aggregates data from all loaded sources into a single response
    suitable for rendering the main dashboard view:

    - Total movies, ratings, and unique users
    - Global average rating
    - Genre count
    - The highest-rated movie (with a minimum vote threshold)
    - Dataset metadata (name, version, source)
    - Timestamp of the last data processing run

    Returns:
        OverviewResponse with all dashboard summary fields.
    """
    stats = data_loader.global_stats

    # Find the highest-rated movie with enough ratings to be meaningful
    highest_rated = data_loader.get_highest_rated_movie(min_ratings=10)
    highest_rated_model = None
    if highest_rated:
        highest_rated_model = HighestRatedMovie(**highest_rated)

    # Count actual records from the ratings file if available
    total_records = stats["totalRatings"]

    # Build dataset info
    dataset_info = DatasetInfo(
        name=settings.DATASET_NAME,
        version=settings.DATASET_VERSION,
        source=settings.DATASET_SOURCE,
        records=total_records,
        files=_get_file_info(),
    )

    return OverviewResponse(
        totalMovies=stats["totalMovies"],
        totalRatings=stats["totalRatings"],
        uniqueUsers=stats["uniqueUsers"],
        globalAverageRating=stats["globalAverageRating"],
        genreCount=stats["genreCount"],
        highestRatedMovie=highest_rated_model,
        datasetInfo=dataset_info,
        lastProcessed=data_loader.last_loaded or "unknown",
    )


def _get_file_info() -> list:
    """
    Gather size information for raw dataset files.

    Scans the raw data directory for CSV files and returns their
    names and sizes for the dataset info panel.

    Returns:
        List of dicts with 'name' and 'size' (human-readable) keys.
    """
    files = []
    raw_dir = settings.RAW_DATA_DIR
    if not raw_dir.exists():
        return files

    for f in sorted(raw_dir.iterdir()):
        if f.is_file() and f.suffix == ".csv":
            size_bytes = f.stat().st_size
            # Format file size in a human-readable way
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"

            files.append({"name": f.name, "size": size_str})

    return files
