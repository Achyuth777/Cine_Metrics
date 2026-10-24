"""
Ratings Router
===============
Provides endpoints for rating distribution and trend analysis.

- GET /api/ratings/distribution  — Global rating histogram data (0.5 to 5.0 stars)
- GET /api/ratings/trends        — Monthly rating activity over time (Unix timestamp aggregation)
- GET /api/ratings/years         — Rating volume and average rating by movie release year
"""

import logging
from typing import List

from fastapi import APIRouter

import data_loader
from models import RatingDistribution, RatingTrend, YearRating

logger = logging.getLogger("cinemetrics.routers.ratings")

router = APIRouter(prefix="/api", tags=["Ratings"])


@router.get("/ratings/distribution", response_model=List[RatingDistribution])
async def get_rating_distribution():
    """
    Return the global rating distribution histogram with exact counts and percentages.
    Produced by the RatingDistribution MapReduce job (Job 3).
    """
    if not data_loader.rating_distribution:
        logger.warning("Rating distribution data not available")
        return []

    return [
        RatingDistribution(
            rating=rd["rating"],
            count=rd["count"],
            percentage=rd.get("percentage")
        )
        for rd in data_loader.rating_distribution
    ]


@router.get("/ratings/trends", response_model=List[RatingTrend])
async def get_rating_trends():
    """
    Return monthly rating activity trends.
    Aggregates rating activity by year-month (from ratings.csv timestamp).
    Produced by the RatingTrends MapReduce job (Job 7).
    """
    if not data_loader.rating_trends:
        logger.warning("Rating trends data not available")
        return []

    return [
        RatingTrend(
            yearMonth=rt["yearMonth"],
            count=rt["count"],
            avgRating=rt["avgRating"],
        )
        for rt in data_loader.rating_trends
    ]


@router.get("/ratings/years", response_model=List[YearRating])
async def get_year_ratings():
    """
    Return ratings aggregated by movie release year.
    Produced by the YearRating MapReduce job (Job 5).
    """
    if not data_loader.year_ratings:
        logger.warning("Year ratings data not available")
        return []

    return [
        YearRating(
            year=yr["year"],
            ratingCount=yr["ratingCount"],
            avgRating=yr["avgRating"],
            movieCount=yr.get("movieCount", 0),
        )
        for yr in data_loader.year_ratings
    ]
