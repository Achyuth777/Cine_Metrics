"""
Ratings Router
===============
Provides endpoints for rating distribution and trend analysis.

- GET /api/ratings/distribution  — Global rating histogram data
- GET /api/ratings/trends        — Monthly rating activity over time
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
    Return the global rating distribution histogram.

    Shows how many ratings were given at each rating level
    (0.5, 1.0, 1.5, 2.0, ..., 5.0). This data comes from the
    RatingDistribution MapReduce job.

    Example response:
        [
            {"rating": "0.5", "count": 1370},
            {"rating": "1.0", "count": 2811},
            ...
            {"rating": "5.0", "count": 13211}
        ]

    Returns:
        List of RatingDistribution objects sorted by rating value.
    """
    if not data_loader.rating_distribution:
        logger.warning("Rating distribution data not available")
        return []

    return [
        RatingDistribution(
            rating=rd["rating"],
            count=rd["count"],
        )
        for rd in data_loader.rating_distribution
    ]


@router.get("/ratings/trends", response_model=List[RatingTrend])
async def get_rating_trends():
    """
    Return monthly rating activity trends.

    Shows the number of ratings submitted each month and the average
    rating for that month. Useful for visualizing how user engagement
    and rating patterns change over time.

    Example response:
        [
            {"yearMonth": "2015-03", "count": 1234, "avgRating": 3.56},
            {"yearMonth": "2015-04", "count": 987,  "avgRating": 3.72},
            ...
        ]

    Returns:
        List of RatingTrend objects sorted chronologically.
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
    
    Shows the total ratings and average score for movies released in each year.
    Produced by the YearRating MapReduce job.
    """
    if not data_loader.year_ratings:
        logger.warning("Year ratings data not available")
        return []

    return [
        YearRating(
            year=yr.get("year", "Unknown"),
            ratingCount=yr.get("ratingCount", 0),
            avgRating=yr.get("avgRating", 0.0),
            movieCount=yr.get("movieCount", 0)
        )
        for yr in data_loader.year_ratings
    ]
