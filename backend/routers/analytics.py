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
import math
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
    minRating: float = Query(
        default=4.0, ge=0.5, le=5.0,
        description="Minimum average rating filter (default: 4.0)"
    ),
    minCount: int = Query(
        default=10, ge=1,
        description="Minimum rating count threshold to avoid single-vote noise (default: 10)"
    ),
    maxCount: int = Query(
        default=80, ge=1,
        description="Maximum rating count (gems must remain non-blockbusters, default: 80)"
    ),
):
    """
    Return under-appreciated, highly-rated movies.
    Dynamically recalculates Bayesian scores over the entire catalogue
    when custom thresholds are supplied, matching MapReduce Job 6 logic.
    """
    # Evaluate over all catalog movies
    candidates = []
    global_avg = data_loader.global_stats.get("globalAverageRating", 3.5016)

    for m in data_loader.all_movies:
        avg_r = m.get("avgRating")
        count = m.get("ratingCount") or 0
        if avg_r is not None and avg_r >= minRating and minCount <= count <= maxCount:
            # Score formula: Bayesian weighted rating boosted by inverse popularity penalty
            # S = WR / log2(count + 2)
            wr = m.get("weightedRating") or (
                (count / (count + 10)) * avg_r + (10 / (count + 10)) * global_avg
            )
            score = round(avg_r / math.log2(count + 2), 4)
            candidates.append({
                "movieId": m["movieId"],
                "title": m["title"],
                "genres": m["genres"],
                "year": m.get("year"),
                "avgRating": avg_r,
                "ratingCount": count,
                "hiddenGemScore": score,
                "weightedScore": round(wr, 4),
                "imdbUrl": m.get("imdbUrl"),
                "tmdbUrl": m.get("tmdbUrl"),
            })

    # Sort descending by hiddenGemScore
    candidates.sort(key=lambda x: (x["hiddenGemScore"], x["avgRating"]), reverse=True)
    results = candidates[:limit]

    return [HiddenGem(**c) for c in results]
