"""
CineMetrics Data Loader
========================
Loads and caches all processed analytics data at application startup.

Data flow:
  1. Raw CSVs (movies.csv, ratings.csv) live in data/raw/
  2. MapReduce jobs produce TSV output files in data/processed/
  3. This module reads both sources, merges movie metadata with
     analytics results, and stores everything in module-level dicts
     for instant access by API endpoints.

All loader functions handle missing files gracefully — they log a
warning and return empty results so the API never crashes due to
incomplete data.
"""

import csv
import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import settings

# ──────────────────────────────────────────────
# Logger setup
# ──────────────────────────────────────────────
logger = logging.getLogger("cinemetrics.data_loader")

# ──────────────────────────────────────────────
# Module-level caches (populated by init_data)
# ──────────────────────────────────────────────
movies: Dict[int, dict] = {}             # movieId -> {movieId, title, genres, genreList}
average_ratings: Dict[int, dict] = {}    # movieId -> {movieId, avgRating, ratingCount}
most_rated: List[dict] = []              # sorted list of most-rated movies
rating_distribution: List[dict] = []     # [{rating: "4.0", count: 26818}, ...]
genre_popularity: List[dict] = []        # [{genre, movieCount, ratingCount, avgRating}, ...]
year_ratings: List[dict] = []            # [{year, avgRating, ratingCount}, ...]
hidden_gems: List[dict] = []             # [{movieId, title, genres, avgRating, ratingCount, score}, ...]
rating_trends: List[dict] = []           # [{yearMonth, count, avgRating}, ...]

# Merged movie list with analytics attached
all_movies: List[dict] = []

# Global statistics
global_stats: dict = {
    "totalMovies": 0,
    "totalRatings": 0,
    "uniqueUsers": 0,
    "globalAverageRating": 0.0,
    "genreCount": 0,
}

# Set of all unique genres found
all_genres: set = set()

# Timestamp of when data was last loaded
last_loaded: Optional[str] = None


# ╔══════════════════════════════════════════════════════════════╗
# ║  Helper: Safe file reader                                    ║
# ╚══════════════════════════════════════════════════════════════╝

def _find_output_file(directory: Path) -> Optional[Path]:
    """
    Locate the output file inside a MapReduce output directory.

    MapReduce writes results to files named 'part-r-00000' (or 'part-00000')
    inside the output directory. This helper finds the first such file,
    or falls back to any file that isn't _SUCCESS or a log.

    Args:
        directory: Path to the MapReduce output folder.

    Returns:
        Path to the data file, or None if the directory doesn't exist.
    """
    if not directory.exists():
        return None

    # If it's a file already (not a directory), return it directly
    if directory.is_file():
        return directory

    # Look for standard MapReduce part files first
    for pattern in ["part-r-*", "part-*"]:
        parts = sorted(directory.glob(pattern))
        if parts:
            return parts[0]

    # Fallback: grab any non-metadata file
    for f in directory.iterdir():
        if f.is_file() and f.name not in ("_SUCCESS", "_logs", ".crc"):
            return f

    return None


def _read_tsv_lines(file_path: Path) -> List[List[str]]:
    """
    Read a TSV file and return rows as lists of strings.

    Handles both tab-separated MapReduce output and standard TSV.
    Skips blank lines and comment lines starting with #.

    Args:
        file_path: Absolute path to the TSV file.

    Returns:
        List of rows, each row being a list of string fields.
    """
    rows = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                rows.append(line.split("\t"))
    except Exception as e:
        logger.error(f"Error reading {file_path}: {e}")
    return rows


# ╔══════════════════════════════════════════════════════════════╗
# ║  Individual Loaders                                          ║
# ╚══════════════════════════════════════════════════════════════╝

def load_movies() -> Dict[int, dict]:
    """
    Parse movies.csv from the raw MovieLens dataset.

    Expected CSV columns: movieId, title, genres
    Genres are pipe-separated (e.g. "Action|Adventure|Sci-Fi").

    Returns:
        Dict mapping movieId (int) to movie metadata dict.
    """
    result: Dict[int, dict] = {}
    csv_path = settings.RAW_DATA_DIR / "movies.csv"

    if not csv_path.exists():
        logger.warning(f"Movies file not found: {csv_path}")
        return result

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                movie_id = int(row["movieId"])
                genres_str = row.get("genres", "(no genres listed)")
                genre_list = [g.strip() for g in genres_str.split("|") if g.strip() and g != "(no genres listed)"]
                result[movie_id] = {
                    "movieId": movie_id,
                    "title": row["title"],
                    "genres": genres_str,
                    "genreList": genre_list,
                }
        logger.info(f"✓ Loaded {len(result)} movies from {csv_path.name}")
    except Exception as e:
        logger.error(f"Error loading movies: {e}")

    return result


def load_average_ratings() -> Dict[int, dict]:
    """
    Parse the AverageRating MapReduce output.

    Expected TSV format: movieId \\t avgRating \\t ratingCount
    (Some formats may have movieId \\t avgRating,ratingCount)

    Returns:
        Dict mapping movieId to {avgRating, ratingCount}.
    """
    result: Dict[int, dict] = {}
    output_dir = settings.DATA_DIR / "avgrating"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Average ratings output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 2:
                movie_id = int(fields[0].strip())
                # Handle both "avg\tcount" and "avg,count" formats
                if len(fields) >= 3:
                    avg_rating = float(fields[1].strip())
                    rating_count = int(fields[2].strip())
                else:
                    # Could be "avgRating,ratingCount" in second field
                    parts = fields[1].strip().split(",")
                    avg_rating = float(parts[0].strip())
                    rating_count = int(parts[1].strip()) if len(parts) > 1 else 0

                result[movie_id] = {
                    "movieId": movie_id,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                }
        logger.info(f"✓ Loaded average ratings for {len(result)} movies")
    except Exception as e:
        logger.error(f"Error loading average ratings: {e}")

    return result


def load_most_rated() -> List[dict]:
    """
    Parse the MostRated MapReduce output.

    Expected TSV format: movieId \\t ratingCount
    The output is typically sorted by ratingCount descending.

    Returns:
        List of {movieId, ratingCount} dicts, highest first.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "mostrated"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Most rated output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 2:
                movie_id = int(fields[0].strip())
                count = int(fields[1].strip())
                result.append({"movieId": movie_id, "ratingCount": count})
        # Sort by ratingCount descending
        result.sort(key=lambda x: x["ratingCount"], reverse=True)
        logger.info(f"✓ Loaded most-rated data for {len(result)} movies")
    except Exception as e:
        logger.error(f"Error loading most rated: {e}")

    return result


def load_rating_distribution() -> List[dict]:
    """
    Parse the RatingDistribution MapReduce output.

    Expected TSV format: rating \\t count
    (e.g., "4.0\\t26818")

    Returns:
        List of {rating (str), count (int)} dicts sorted by rating.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "ratingdist"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Rating distribution output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 2:
                rating_val = fields[0].strip()
                count = int(fields[1].strip())
                result.append({"rating": rating_val, "count": count})
        # Sort by rating value
        result.sort(key=lambda x: float(x["rating"]))
        logger.info(f"✓ Loaded rating distribution with {len(result)} buckets")
    except Exception as e:
        logger.error(f"Error loading rating distribution: {e}")

    return result


def load_genre_popularity() -> List[dict]:
    """
    Parse the GenrePopularity MapReduce output.

    Expected TSV format: genre \\t movieCount \\t ratingCount \\t avgRating
    (Some formats: genre \\t ratingCount)

    Returns:
        List of genre stats dicts sorted by ratingCount descending.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "genrepop"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Genre popularity output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 2:
                genre = fields[0].strip()
                if genre == "(no genres listed)":
                    continue
                if len(fields) >= 4:
                    movie_count = int(fields[1].strip())
                    rating_count = int(fields[2].strip())
                    avg_rating = float(fields[3].strip())
                elif len(fields) >= 3:
                    movie_count = int(fields[1].strip())
                    rating_count = int(fields[2].strip())
                    avg_rating = 0.0
                else:
                    # Minimal format: genre \t ratingCount
                    movie_count = 0
                    rating_count = int(fields[1].strip())
                    avg_rating = 0.0

                result.append({
                    "genre": genre,
                    "movieCount": movie_count,
                    "ratingCount": rating_count,
                    "avgRating": round(avg_rating, 4),
                })
        result.sort(key=lambda x: x["ratingCount"], reverse=True)
        logger.info(f"✓ Loaded genre popularity for {len(result)} genres")
    except Exception as e:
        logger.error(f"Error loading genre popularity: {e}")

    return result


def load_year_ratings() -> List[dict]:
    """
    Parse the YearRating MapReduce output.

    Expected TSV format: year \\t avgRating \\t ratingCount

    Returns:
        List of {year, avgRating, ratingCount} dicts sorted by year.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "yearrating"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Year ratings output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 2:
                year = fields[0].strip()
                if len(fields) >= 3:
                    avg_rating = float(fields[1].strip())
                    rating_count = int(fields[2].strip())
                else:
                    avg_rating = float(fields[1].strip())
                    rating_count = 0
                result.append({
                    "year": year,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                })
        result.sort(key=lambda x: x["year"])
        logger.info(f"✓ Loaded year ratings for {len(result)} years")
    except Exception as e:
        logger.error(f"Error loading year ratings: {e}")

    return result


def load_hidden_gems() -> List[dict]:
    """
    Parse the HiddenGems MapReduce output.

    Expected TSV format: movieId \\t avgRating \\t ratingCount \\t score
    (score = composite metric favouring high rating + low popularity)

    Returns:
        List of hidden gem dicts sorted by score descending.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "hiddengems"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Hidden gems output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 3:
                movie_id = int(fields[0].strip())
                avg_rating = float(fields[1].strip())
                rating_count = int(fields[2].strip())
                # Score may be in 4th field, or we compute it ourselves
                if len(fields) >= 4:
                    score = float(fields[3].strip())
                else:
                    # Simple hidden gem score: high rating, low count
                    score = round(avg_rating / math.log2(rating_count + 2), 4)

                result.append({
                    "movieId": movie_id,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                    "hiddenGemScore": round(score, 4),
                })
        result.sort(key=lambda x: x["hiddenGemScore"], reverse=True)
        logger.info(f"✓ Loaded {len(result)} hidden gems")
    except Exception as e:
        logger.error(f"Error loading hidden gems: {e}")

    return result


def load_rating_trends() -> List[dict]:
    """
    Parse the RatingTrends MapReduce output.

    Expected TSV format: yearMonth \\t count \\t avgRating
    (yearMonth is in "YYYY-MM" format)

    Returns:
        List of {yearMonth, count, avgRating} dicts sorted chronologically.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "ratingtrends"
    data_file = _find_output_file(output_dir)

    if not data_file:
        logger.warning(f"Rating trends output not found in {output_dir}")
        return result

    try:
        rows = _read_tsv_lines(data_file)
        for fields in rows:
            if len(fields) >= 3:
                year_month = fields[0].strip()
                count = int(fields[1].strip())
                avg_rating = float(fields[2].strip())
                result.append({
                    "yearMonth": year_month,
                    "count": count,
                    "avgRating": round(avg_rating, 4),
                })
            elif len(fields) >= 2:
                year_month = fields[0].strip()
                count = int(fields[1].strip())
                result.append({
                    "yearMonth": year_month,
                    "count": count,
                    "avgRating": 0.0,
                })
        result.sort(key=lambda x: x["yearMonth"])
        logger.info(f"✓ Loaded rating trends for {len(result)} months")
    except Exception as e:
        logger.error(f"Error loading rating trends: {e}")

    return result


# ╔══════════════════════════════════════════════════════════════╗
# ║  Stats Calculators                                           ║
# ╚══════════════════════════════════════════════════════════════╝

def _count_unique_users_and_ratings() -> Tuple[int, int, float]:
    """
    Scan ratings.csv to count unique users, total ratings, and global average.

    This reads the raw ratings file line-by-line to avoid loading the
    entire file into memory (important for large datasets).

    Returns:
        Tuple of (unique_user_count, total_rating_count, global_avg_rating).
    """
    ratings_path = settings.RAW_DATA_DIR / "ratings.csv"
    if not ratings_path.exists():
        logger.warning(f"Ratings file not found: {ratings_path}")
        return 0, 0, 0.0

    users = set()
    total_count = 0
    rating_sum = 0.0

    try:
        with open(ratings_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                users.add(row["userId"])
                total_count += 1
                rating_sum += float(row["rating"])

        avg = round(rating_sum / total_count, 4) if total_count > 0 else 0.0
        logger.info(f"✓ Counted {len(users)} unique users, {total_count} ratings (avg={avg})")
        return len(users), total_count, avg
    except Exception as e:
        logger.error(f"Error counting users/ratings: {e}")
        return 0, 0, 0.0


def _compute_weighted_rating(avg_rating: float, count: int,
                              global_avg: float, min_votes: int = 10) -> float:
    """
    Calculate a Bayesian weighted rating (IMDb formula).

    Formula: WR = (v / (v + m)) * R  +  (m / (v + m)) * C
    where:
        v = number of votes for this movie
        m = minimum votes required (threshold)
        R = average rating for this movie
        C = global average rating across all movies

    This prevents movies with very few ratings from appearing at the
    top of sorted lists unfairly.

    Args:
        avg_rating: Movie's average rating.
        count: Number of ratings the movie received.
        global_avg: Dataset-wide average rating.
        min_votes: Minimum vote threshold.

    Returns:
        Weighted rating as a float.
    """
    if count == 0:
        return 0.0
    return round(
        (count / (count + min_votes)) * avg_rating +
        (min_votes / (count + min_votes)) * global_avg,
        4,
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  Master Initialization                                       ║
# ╚══════════════════════════════════════════════════════════════╝

def init_data() -> None:
    """
    Load all data sources and merge them into the module-level caches.

    Called once at application startup from main.py's lifespan handler.
    After this function completes, all API endpoints can read directly
    from the module-level variables without any I/O.

    Processing steps:
        1. Load raw movie metadata
        2. Load each MapReduce output
        3. Count unique users from ratings.csv
        4. Merge analytics into movie records
        5. Compute weighted ratings
        6. Build global statistics
    """
    global movies, average_ratings, most_rated, rating_distribution
    global genre_popularity, year_ratings, hidden_gems, rating_trends
    global all_movies, global_stats, all_genres, last_loaded

    logger.info("=" * 60)
    logger.info("CineMetrics Data Loader — Starting initialization...")
    logger.info(f"  Raw data dir:       {settings.RAW_DATA_DIR}")
    logger.info(f"  Processed data dir: {settings.DATA_DIR}")
    logger.info("=" * 60)

    # Step 1: Load raw movie metadata
    movies = load_movies()

    # Step 2: Load each MapReduce output
    average_ratings = load_average_ratings()
    most_rated = load_most_rated()
    rating_distribution = load_rating_distribution()
    genre_popularity = load_genre_popularity()
    year_ratings = load_year_ratings()
    hidden_gems = load_hidden_gems()
    rating_trends = load_rating_trends()

    # Step 3: Count unique users and total ratings from raw data
    unique_users, total_ratings, global_avg = _count_unique_users_and_ratings()

    # If we couldn't read ratings.csv, derive totals from average_ratings
    if total_ratings == 0 and average_ratings:
        total_ratings = sum(r["ratingCount"] for r in average_ratings.values())
        if total_ratings > 0:
            rating_sum = sum(r["avgRating"] * r["ratingCount"] for r in average_ratings.values())
            global_avg = round(rating_sum / total_ratings, 4)
            logger.info(f"  Derived total ratings from avgrating data: {total_ratings}")

    # Step 4: Build hidden gem movieId set for quick lookup
    hidden_gem_ids = {g["movieId"] for g in hidden_gems}

    # Step 5: Merge everything into all_movies
    merged: List[dict] = []
    genre_set: set = set()

    for movie_id, movie in movies.items():
        record = {**movie}

        # Attach average rating data
        if movie_id in average_ratings:
            ar = average_ratings[movie_id]
            record["avgRating"] = ar["avgRating"]
            record["ratingCount"] = ar["ratingCount"]
        else:
            record["avgRating"] = None
            record["ratingCount"] = 0

        # Compute weighted rating
        if record["avgRating"] is not None and record["ratingCount"] > 0:
            record["weightedRating"] = _compute_weighted_rating(
                record["avgRating"], record["ratingCount"], global_avg
            )
        else:
            record["weightedRating"] = None

        # Mark hidden gems
        record["isHiddenGem"] = movie_id in hidden_gem_ids
        if record["isHiddenGem"]:
            gem = next((g for g in hidden_gems if g["movieId"] == movie_id), None)
            record["hiddenGemScore"] = gem["hiddenGemScore"] if gem else None
        else:
            record["hiddenGemScore"] = None

        # Collect all genres
        for g in record.get("genreList", []):
            genre_set.add(g)

        merged.append(record)

    all_movies = merged
    all_genres = genre_set

    # Enrich hidden gems with movie metadata (title, genres)
    for gem in hidden_gems:
        movie = movies.get(gem["movieId"])
        if movie:
            gem["title"] = movie["title"]
            gem["genres"] = movie["genres"]
        else:
            gem["title"] = f"Unknown (ID: {gem['movieId']})"
            gem["genres"] = ""

    # Enrich most_rated with movie metadata
    for mr in most_rated:
        movie = movies.get(mr["movieId"])
        if movie:
            mr["title"] = movie["title"]
            mr["genres"] = movie["genres"]

    # Step 6: Build global stats
    # If genre_popularity loaded, use its count; otherwise count from movies
    genre_count = len(genre_popularity) if genre_popularity else len(genre_set)

    global_stats = {
        "totalMovies": len(movies),
        "totalRatings": total_ratings,
        "uniqueUsers": unique_users,
        "globalAverageRating": global_avg,
        "genreCount": genre_count,
    }

    last_loaded = datetime.now(timezone.utc).isoformat()

    logger.info("=" * 60)
    logger.info("CineMetrics Data Loader — Initialization complete!")
    logger.info(f"  Movies:      {global_stats['totalMovies']}")
    logger.info(f"  Ratings:     {global_stats['totalRatings']}")
    logger.info(f"  Users:       {global_stats['uniqueUsers']}")
    logger.info(f"  Avg Rating:  {global_stats['globalAverageRating']}")
    logger.info(f"  Genres:      {global_stats['genreCount']}")
    logger.info(f"  Hidden Gems: {len(hidden_gems)}")
    logger.info("=" * 60)


def get_highest_rated_movie(min_ratings: int = 10) -> Optional[dict]:
    """
    Find the highest-rated movie that has at least `min_ratings` ratings.

    This prevents movies with a single 5-star rating from topping the list.

    Args:
        min_ratings: Minimum number of ratings required.

    Returns:
        Dict with movieId, title, avgRating, ratingCount — or None.
    """
    candidates = [
        m for m in all_movies
        if m.get("avgRating") is not None and m.get("ratingCount", 0) >= min_ratings
    ]
    if not candidates:
        return None

    best = max(candidates, key=lambda m: (m["avgRating"], m["ratingCount"]))
    return {
        "movieId": best["movieId"],
        "title": best["title"],
        "avgRating": best["avgRating"],
        "ratingCount": best["ratingCount"],
    }
