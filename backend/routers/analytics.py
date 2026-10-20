"""
Analytics Router
=================
Provides the /api/analytics/hidden-gems endpoint for discovering
under-appreciated, highly-rated movies.

Hidden gems are movies with high average ratings but relatively few
ratings — films that are loved by those who've seen them but haven't
reached mainstream popularity.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Query

import data_loader
from models import HiddenGem

logger = logging.getLogger("cinemetrics.routers.analytics")

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics/hidden-gems", response_model=List[HiddenGem])
async def get_hidden_gems(
    limit: int = Query(
        default=20, ge=1, le=100,
        description="Maximum number of hidden gems to return"
    ),
    minRating: Optional[float] = Query(
        default=None, ge=0, le=5,
        description="Minimum average rating filter"
    ),
    maxCount: Optional[int] = Query(
        default=None, ge=0,
        description="Maximum rating count (gems should have few ratings)"
    ),
):
    """
    Return a list of hidden gem movies.

    Hidden gems are identified by the HiddenGems MapReduce job using a
    composite score that rewards high ratings and penalizes high popularity.

    Optional filters:
        - `limit`: Max results to return (default 20, max 100)
        - `minRating`: Only include gems with avg rating >= this value
        - `maxCount`: Only include gems with rating count <= this value

    Results are sorted by hiddenGemScore descending (best gems first).

    Returns:
        List of HiddenGem objects with title, genres, rating, and score.
    """
    gems = list(data_loader.hidden_gems)

    if not gems:
        logger.warning("No hidden gems data available")
        return []

    # Apply optional filters
    if minRating is not None:
        gems = [g for g in gems if g.get("avgRating", 0) >= minRating]

    if maxCount is not None:
        gems = [g for g in gems if g.get("ratingCount", 0) <= maxCount]

    # Already sorted by score in data_loader, just limit
    gems = gems[:limit]

    return [
        HiddenGem(
            movieId=g["movieId"],
            title=g.get("title", f"Unknown (ID: {g['movieId']})"),
            genres=g.get("genres", ""),
            avgRating=g["avgRating"],
            ratingCount=g["ratingCount"],
            hiddenGemScore=g["hiddenGemScore"],
            weightedScore=g.get("weightedScore", g["hiddenGemScore"]),
        )
        for g in gems
    ]
