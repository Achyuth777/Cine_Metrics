"""
Movies Router
==============
Provides endpoints for browsing and searching the movie catalog.

- GET /api/movies       — Paginated, sortable, filterable movie list
- GET /api/movies/{id}  — Detailed view of a single movie with all analytics
"""

import logging
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import data_loader
from config import settings
from models import PaginatedMovies, MovieSummary, MovieDetail

logger = logging.getLogger("cinemetrics.routers.movies")

router = APIRouter(prefix="/api", tags=["Movies"])


@router.get("/movies", response_model=PaginatedMovies)
async def get_movies(
    page: int = Query(
        default=1, ge=1,
        description="Page number (1-indexed)"
    ),
    pageSize: int = Query(
        default=20, ge=1, le=100,
        description="Number of movies per page (max 100)"
    ),
    search: Optional[str] = Query(
        default=None,
        description="Search term to filter by movie title (case-insensitive)"
    ),
    genre: Optional[str] = Query(
        default=None,
        description="Filter by genre name (exact match, case-insensitive)"
    ),
    minRating: Optional[float] = Query(
        default=None, ge=0, le=5,
        description="Minimum average rating filter"
    ),
    maxRating: Optional[float] = Query(
        default=None, ge=0, le=5,
        description="Maximum average rating filter"
    ),
    minCount: Optional[int] = Query(
        default=None, ge=0,
        description="Minimum number of ratings"
    ),
    sortBy: str = Query(
        default="ratingCount",
        description="Sort field: avgRating, weightedRating, ratingCount, title"
    ),
    sortOrder: str = Query(
        default="desc",
        description="Sort direction: asc or desc"
    ),
):
    """
    Return a paginated, sortable, filterable list of movies.

    Filtering:
        - `search`: Substring match on movie title (case-insensitive)
        - `genre`: Movies must contain this genre (case-insensitive)
        - `minRating` / `maxRating`: Filter by average rating range
        - `minCount`: Only include movies with at least this many ratings

    Sorting:
        - `sortBy`: One of avgRating, weightedRating, ratingCount, title
        - `sortOrder`: asc or desc

    Pagination:
        - `page`: 1-indexed page number
        - `pageSize`: Items per page (1–100)

    Returns:
        PaginatedMovies with the filtered/sorted/paginated movie list
        plus metadata (total count, page info).
    """
    # Start with all movies
    filtered = list(data_loader.all_movies)

    # ── Apply filters ──────────────────────────
    if search:
        search_lower = search.lower()
        filtered = [m for m in filtered if search_lower in m["title"].lower()]

    if genre:
        genre_lower = genre.lower()
        filtered = [
            m for m in filtered
            if any(g.lower() == genre_lower for g in m.get("genreList", []))
        ]

    if minRating is not None:
        filtered = [
            m for m in filtered
            if m.get("avgRating") is not None and m["avgRating"] >= minRating
        ]

    if maxRating is not None:
        filtered = [
            m for m in filtered
            if m.get("avgRating") is not None and m["avgRating"] <= maxRating
        ]

    if minCount is not None:
        filtered = [
            m for m in filtered
            if (m.get("ratingCount") or 0) >= minCount
        ]

    # ── Sorting ────────────────────────────────
    reverse = sortOrder.lower() != "asc"

    # Define sort key based on sortBy parameter
    if sortBy == "title":
        # Alphabetical sort — None-safe
        filtered.sort(key=lambda m: m.get("title", "").lower(), reverse=reverse)
    elif sortBy == "avgRating":
        # Movies without ratings go to the bottom
        filtered.sort(
            key=lambda m: m.get("avgRating") if m.get("avgRating") is not None else -1,
            reverse=reverse,
        )
    elif sortBy == "weightedRating":
        filtered.sort(
            key=lambda m: m.get("weightedRating") if m.get("weightedRating") is not None else -1,
            reverse=reverse,
        )
    else:
        # Default: sort by ratingCount
        filtered.sort(
            key=lambda m: m.get("ratingCount") or 0,
            reverse=reverse,
        )

    # ── Pagination ─────────────────────────────
    total = len(filtered)
    total_pages = math.ceil(total / pageSize) if total > 0 else 1
    start = (page - 1) * pageSize
    end = start + pageSize
    page_items = filtered[start:end]

    # Convert to response models
    movie_summaries = [
        MovieSummary(
            movieId=m["movieId"],
            title=m["title"],
            genres=m["genres"],
            year=m.get("year"),
            genreList=m.get("genreList", [g.strip() for g in m.get("genres", "").split("|") if g.strip()]),
            avgRating=m.get("avgRating"),
            ratingCount=m.get("ratingCount"),
            weightedRating=m.get("weightedRating"),
        )
        for m in page_items
    ]

    return PaginatedMovies(
        movies=movie_summaries,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/movies/{movie_id}", response_model=MovieDetail)
async def get_movie_detail(movie_id: int):
    """
    Return detailed information for a single movie.

    Includes all base metadata plus every piece of analytics data
    available for this movie: average rating, rating count, weighted
    rating, rating distribution, and hidden gem status.

    Args:
        movie_id: The MovieLens movieId to look up.

    Returns:
        MovieDetail with full analytics data.

    Raises:
        404: If the movieId doesn't exist in the dataset.
    """
    # Look up base movie data
    movie = data_loader.movies.get(movie_id)
    if not movie:
        raise HTTPException(
            status_code=404,
            detail=f"Movie with ID {movie_id} not found in the dataset.",
        )

    # Find merged record with analytics
    merged = next(
        (m for m in data_loader.all_movies if m["movieId"] == movie_id),
        None,
    )

    if not merged:
        # Fallback to base movie data without analytics
        merged = {**movie, "avgRating": None, "ratingCount": 0,
                  "weightedRating": None, "isHiddenGem": False,
                  "hiddenGemScore": None}

    # Build per-movie rating distribution (if we have global distribution data)
    # Note: MapReduce output is typically aggregated globally, so per-movie
    # distribution would need a separate job. We return None here unless
    # specific per-movie data is available.
    rating_dist = None

    return MovieDetail(
        movieId=merged["movieId"],
        title=merged["title"],
        genres=merged["genres"],
        avgRating=merged.get("avgRating"),
        ratingCount=merged.get("ratingCount", 0),
        weightedRating=merged.get("weightedRating"),
        genreList=merged.get("genreList", []),
        ratingDistribution=rating_dist,
        isHiddenGem=merged.get("isHiddenGem", False),
        hiddenGemScore=merged.get("hiddenGemScore"),
    )
