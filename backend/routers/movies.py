"""
Movies Router
==============
Provides endpoints for browsing, searching, filtering, and comparing movies.

- GET /api/movies         — Paginated, sortable, filterable movie list
- GET /api/movies/compare — Side-by-side comparison of 2 to 4 movies
- GET /api/movies/{id}    — Detailed view of a single movie with full analytics
"""

import logging
import math
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

import data_loader
from config import settings
from models import (
    PaginatedMovies,
    MovieSummary,
    MovieDetail,
    MovieComparisonResponse
)

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
        description="Filter by a single genre (e.g. 'Action')"
    ),
    genres: Optional[str] = Query(
        default=None,
        description="Filter by multiple genres, comma-separated (e.g. 'Action,Sci-Fi')"
    ),
    genreMode: str = Query(
        default="or",
        description="Multi-genre logic: 'and' (movie must have all) or 'or' (movie has any)"
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
    minYear: Optional[int] = Query(
        default=None,
        description="Minimum release year (e.g. 1990)"
    ),
    maxYear: Optional[int] = Query(
        default=None,
        description="Maximum release year (e.g. 2020)"
    ),
    sortBy: str = Query(
        default="ratingCount",
        description="Sort field: ratingCount, avgRating, weightedRating, title, year"
    ),
    sortOrder: str = Query(
        default="desc",
        description="Sort direction: asc or desc"
    ),
):
    """
    Return a paginated, sortable, filterable list of movies from the complete dataset.
    """
    filtered = list(data_loader.all_movies)

    # ── Search filter ──────────────────────────
    if search and search.strip():
        search_lower = search.strip().lower()
        filtered = [m for m in filtered if search_lower in m["title"].lower()]

    # ── Genre filters ──────────────────────────
    # Check both singular 'genre' and comma-separated 'genres'
    active_genres = []
    if genres and genres.strip():
        active_genres.extend([g.strip().lower() for g in genres.split(",") if g.strip()])
    elif genre and genre.strip():
        active_genres.append(genre.strip().lower())

    if active_genres:
        if genreMode.lower() == "and":
            filtered = [
                m for m in filtered
                if all(any(ag == g.lower() for g in m.get("genreList", [])) for ag in active_genres)
            ]
        else:
            filtered = [
                m for m in filtered
                if any(any(ag == g.lower() for g in m.get("genreList", [])) for ag in active_genres)
            ]

    # ── Rating score filters ───────────────────
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

    # ── Year filters ───────────────────────────
    if minYear is not None:
        filtered = [
            m for m in filtered
            if m.get("year") is not None and m["year"] >= minYear
        ]

    if maxYear is not None:
        filtered = [
            m for m in filtered
            if m.get("year") is not None and m["year"] <= maxYear
        ]

    # ── Sorting ────────────────────────────────
    reverse = sortOrder.lower() != "asc"

    if sortBy == "title":
        filtered.sort(key=lambda m: m.get("title", "").lower(), reverse=reverse)
    elif sortBy == "year":
        # Missing years placed at bottom
        filtered.sort(
            key=lambda m: m.get("year") if m.get("year") is not None else (-1 if reverse else 9999),
            reverse=reverse
        )
    elif sortBy == "avgRating":
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
        # Default: ratingCount
        filtered.sort(
            key=lambda m: m.get("ratingCount") or 0,
            reverse=reverse,
        )

    # ── Pagination ─────────────────────────────
    total = len(filtered)
    total_pages = math.ceil(total / pageSize) if total > 0 else 1
    # Guard against requested page being out of range
    effective_page = max(1, min(page, total_pages)) if total > 0 else 1
    start = (effective_page - 1) * pageSize
    end = start + pageSize
    page_items = filtered[start:end]

    movie_summaries = [
        MovieSummary(
            movieId=m["movieId"],
            title=m["title"],
            genres=m["genres"],
            year=m.get("year"),
            genreList=m.get("genreList", [g.strip() for g in m.get("genres", "").split("|") if g.strip()]),
            avgRating=m.get("avgRating"),
            ratingCount=m.get("ratingCount") or 0,
            weightedRating=m.get("weightedRating"),
            imdbId=m.get("imdbId"),
            tmdbId=m.get("tmdbId"),
            imdbUrl=m.get("imdbUrl"),
            tmdbUrl=m.get("tmdbUrl"),
        )
        for m in page_items
    ]

    return PaginatedMovies(
        movies=movie_summaries,
        items=movie_summaries,
        total=total,
        page=effective_page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


def _build_movie_detail(m: dict) -> MovieDetail:
    """Helper to convert a merged movie dict into a full MovieDetail model."""
    m_id = m["movieId"]
    rating_dist = data_loader.movie_rating_distributions.get(m_id)
    if not rating_dist:
        rating_dist = {"0.5": 0, "1.0": 0, "1.5": 0, "2.0": 0, "2.5": 0,
                       "3.0": 0, "3.5": 0, "4.0": 0, "4.5": 0, "5.0": 0}

    # Build Viva Bayesian formula breakdown
    global_avg = data_loader.global_stats.get("globalAverageRating", 3.5016)
    v = m.get("ratingCount") or 0
    r = m.get("avgRating") or 0.0
    m_threshold = 10
    wr = m.get("weightedRating")

    bayesian_info = {
        "v": v,
        "m": m_threshold,
        "R": r,
        "C": global_avg,
        "WR": wr,
        "formula": "WR = (v / (v + m)) * R + (m / (v + m)) * C",
        "explanation": f"Weights movie average ({r:.2f}) by vote count ({v}) against global mean ({global_avg:.2f})"
    }

    return MovieDetail(
        movieId=m_id,
        title=m["title"],
        genres=m["genres"],
        year=m.get("year"),
        genreList=m.get("genreList", []),
        avgRating=m.get("avgRating"),
        ratingCount=m.get("ratingCount") or 0,
        weightedRating=m.get("weightedRating"),
        imdbId=m.get("imdbId"),
        tmdbId=m.get("tmdbId"),
        imdbUrl=m.get("imdbUrl"),
        tmdbUrl=m.get("tmdbUrl"),
        ratingDistribution=rating_dist,
        isHiddenGem=m.get("isHiddenGem", False),
        hiddenGemScore=m.get("hiddenGemScore"),
        rankMostRated=m.get("rankMostRated"),
        globalRankAvg=m.get("globalRankAvg"),
        bayesianFormula=bayesian_info
    )


@router.get("/movies/compare", response_model=MovieComparisonResponse)
async def compare_movies(
    ids: str = Query(..., description="Comma-separated movie IDs (2 to 4 movies, e.g. '1,356,318')")
):
    """
    Compare 2 to 4 movies side-by-side with genuine rating histograms and Bayesian metrics.
    """
    try:
        movie_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid movie IDs provided. Must be integers.")

    if len(movie_ids) < 2 or len(movie_ids) > 4:
        raise HTTPException(
            status_code=400,
            detail=f"Comparison requires between 2 and 4 movies. Provided {len(movie_ids)}."
        )

    movie_records = []
    for mid in movie_ids:
        found = next((m for m in data_loader.all_movies if m["movieId"] == mid), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Movie ID {mid} not found in catalog.")
        movie_records.append(_build_movie_detail(found))

    # Calculate common genres
    genre_sets = [set(m.genreList) for m in movie_records]
    common = sorted(list(set.intersection(*genre_sets))) if genre_sets else []

    # Generate analytical summary
    global_avg = data_loader.global_stats.get("globalAverageRating", 3.5016)
    highest_vol = max(movie_records, key=lambda m: m.ratingCount or 0)
    highest_avg = max(movie_records, key=lambda m: m.avgRating or 0.0)

    summary = (
        f"Comparing {len(movie_records)} movies: '{highest_vol.title}' leads rating volume with {highest_vol.ratingCount:,} reviews, "
        f"while '{highest_avg.title}' achieves highest mean rating at {highest_avg.avgRating:.2f} "
        f"(vs global benchmark of {global_avg:.2f})."
    )

    return MovieComparisonResponse(
        movies=movie_records,
        commonGenres=common,
        globalAverageRating=global_avg,
        analysisSummary=summary
    )


@router.get("/movies/{movie_id}", response_model=MovieDetail)
async def get_movie_detail(movie_id: int):
    """
    Return detailed information for a single movie, including real per-movie
    rating distribution (0.5 to 5.0 stars) and Bayesian formula breakdown.
    """
    movie = next((m for m in data_loader.all_movies if m["movieId"] == movie_id), None)
    if not movie:
        # Check base movies dict
        base = data_loader.movies.get(movie_id)
        if not base:
            raise HTTPException(
                status_code=404,
                detail=f"Movie with ID {movie_id} not found in the dataset.",
            )
        movie = base

    return _build_movie_detail(movie)
