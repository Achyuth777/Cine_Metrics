"""
Genres Router
==============
Provides the /api/genres endpoint for genre-level analytics.

Uses pre-computed genre popularity data from the GenrePopularity
MapReduce job. If that data isn't available, falls back to computing
genre stats from the in-memory movie records.
"""

import logging
from collections import defaultdict
from typing import List

from fastapi import APIRouter

import data_loader
from models import GenreStats

logger = logging.getLogger("cinemetrics.routers.genres")

router = APIRouter(prefix="/api", tags=["Genres"])


@router.get("/genres", response_model=List[GenreStats])
async def get_genres():
    """
    Return analytics for each movie genre.

    Each genre entry includes:
    - `genre`: Genre name (e.g. "Drama", "Comedy")
    - `movieCount`: Number of movies tagged with this genre
    - `ratingCount`: Total number of ratings across movies in this genre
    - `avgRating`: Mean rating across all movies in this genre

    Results are sorted by ratingCount descending (most popular genres first).

    If pre-computed MapReduce data is available, it's used directly.
    Otherwise, stats are computed on-the-fly from the in-memory movie list.

    Returns:
        List of GenreStats objects.
    """
    # Prefer pre-computed data from the GenrePopularity MapReduce job
    if data_loader.genre_popularity:
        return [
            GenreStats(
                genre=gp["genre"],
                movieCount=gp["movieCount"],
                ratingCount=gp["ratingCount"],
                avgRating=gp["avgRating"],
            )
            for gp in data_loader.genre_popularity
        ]

    # Fallback: compute from in-memory movie data
    logger.info("Computing genre stats from in-memory movie data (no MapReduce output)")
    genre_data = defaultdict(lambda: {"movieCount": 0, "ratingCount": 0, "ratingSum": 0.0})

    for movie in data_loader.all_movies:
        for genre in movie.get("genreList", []):
            gd = genre_data[genre]
            gd["movieCount"] += 1
            count = movie.get("ratingCount") or 0
            avg = movie.get("avgRating") or 0.0
            gd["ratingCount"] += count
            gd["ratingSum"] += avg * count

    result = []
    for genre, stats in genre_data.items():
        avg = round(stats["ratingSum"] / stats["ratingCount"], 4) if stats["ratingCount"] > 0 else 0.0
        result.append(GenreStats(
            genre=genre,
            movieCount=stats["movieCount"],
            ratingCount=stats["ratingCount"],
            avgRating=avg,
        ))

    # Sort by ratingCount descending
    result.sort(key=lambda x: x.ratingCount, reverse=True)
    return result
