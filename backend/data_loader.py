"""
CineMetrics Data Loader
========================
Loads and caches all processed analytics data at application startup.

Data flow:
  1. Raw CSVs (movies.csv, ratings.csv, links.csv) live in data/raw/
  2. MapReduce jobs produce TSV output partition files in data/processed/
  3. This module reads all partitions (part-r-*, part-m-*, part-*), merges
     movie metadata with analytics results, and stores everything in
     module-level caches for instant access by API endpoints.

All loader functions handle missing files gracefully — they log a
warning and return empty results so the API never crashes due to
incomplete data.
"""

import csv
import json
import logging
import math
import os
import re
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
movies: Dict[int, dict] = {}             # movieId -> {movieId, title, genres, genreList, year, imdbUrl, ...}
links: Dict[int, dict] = {}              # movieId -> {movieId, imdbId, tmdbId, imdbUrl, tmdbUrl}
average_ratings: Dict[int, dict] = {}    # movieId -> {movieId, avgRating, ratingCount}
most_rated: List[dict] = []              # sorted list of most-rated movies
rating_distribution: List[dict] = []     # [{rating: "4.0", count: 26818, percentage: 26.6}, ...]
genre_popularity: List[dict] = []        # [{genre, movieCount, ratingCount, avgRating}, ...]
year_ratings: List[dict] = []            # [{year, avgRating, ratingCount, movieCount}, ...]
hidden_gems: List[dict] = []             # [{movieId, title, genres, avgRating, ratingCount, hiddenGemScore}, ...]
rating_trends: List[dict] = []           # [{yearMonth, count, avgRating}, ...]

# Per-movie rating distributions: movieId -> {"0.5": count, ..., "5.0": count}
movie_rating_distributions: Dict[int, Dict[str, int]] = {}

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

# Recorded job metadata and processing provenance
provenance_info: dict = {
    "engine": "python-reference",
    "mode": "offline",
    "processedAt": None,
    "apiLoadedAt": None,
    "note": "Pre-processed analytics snapshot",
    "jobs": []
}

# Timestamp of when data was last loaded into API memory
last_loaded: Optional[str] = None

# Regex patterns for extracting 4-digit release year from movie titles
YEAR_TRAILING_REGEX = re.compile(r"\((\d{4})\)\s*$")
YEAR_GENERAL_REGEX = re.compile(r"\((\d{4})\)")


def extract_year(title: str) -> Optional[int]:
    """
    Extract a 4-digit release year from a movie title string.
    
    Examples:
      'Toy Story (1995)' -> 1995
      'Apollo 13 (1995)' -> 1995
      'Babylon 5'        -> None
    """
    if not title:
        return None
    match = YEAR_TRAILING_REGEX.search(title)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass
    # Try general match if trailing match did not succeed
    match_gen = YEAR_GENERAL_REGEX.search(title)
    if match_gen:
        try:
            y = int(match_gen.group(1))
            if 1880 <= y <= 2035:
                return y
        except ValueError:
            pass
    return None


# ╔══════════════════════════════════════════════════════════════╗
# ║  Helper: Multi-Partition Safe File Reader                    ║
# ╚══════════════════════════════════════════════════════════════╝

def _find_output_files(directory: Path) -> List[Path]:
    """
    Locate all output partition files inside a MapReduce output directory.

    MapReduce writes results to multiple partitions: 'part-r-00000', 'part-r-00001',
    etc. This helper finds ALL partition files matching standard naming conventions,
    concatenating results across partitions to prevent data loss.

    Args:
        directory: Path to the MapReduce output folder.

    Returns:
        List of Path objects for all matching partition files.
    """
    if not directory.exists():
        return []

    # If it's a file already (not a directory), return it directly
    if directory.is_file():
        return [directory]

    # Collect standard MapReduce part files
    found_files: List[Path] = []
    for pattern in ["part-r-*", "part-m-*", "part-*"]:
        for p in sorted(directory.glob(pattern)):
            if p.is_file() and p.stat().st_size > 0 and p not in found_files:
                found_files.append(p)

    if found_files:
        return found_files

    # Fallback: grab any non-metadata, non-empty file
    for f in sorted(directory.iterdir()):
        if f.is_file() and f.name not in ("_SUCCESS", "_logs", ".crc") and not f.name.startswith("."):
            if f.stat().st_size > 0:
                found_files.append(f)

    return found_files


def _find_output_file(directory: Path) -> Optional[Path]:
    """Single file accessor for backward compatibility."""
    files = _find_output_files(directory)
    return files[0] if files else None


def _read_tsv_lines(file_path: Path) -> List[List[str]]:
    """
    Read a TSV file and return rows as lists of strings.
    Handles both tab-separated MapReduce output and standard TSV.
    Skips blank lines and comment lines starting with #.
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


def _read_tsv_partitions(directory: Path) -> List[List[str]]:
    """
    Read all TSV partitions in a directory and return aggregated rows.
    """
    files = _find_output_files(directory)
    if not files:
        return []
    all_rows = []
    for f in files:
        all_rows.extend(_read_tsv_lines(f))
    return all_rows


# ╔══════════════════════════════════════════════════════════════╗
# ║  Individual Loaders                                          ║
# ╚══════════════════════════════════════════════════════════════╝

def load_links() -> Dict[int, dict]:
    """
    Parse links.csv from MovieLens to obtain external IMDb and TMDb IDs.
    
    Expected CSV columns: movieId, imdbId, tmdbId
    Returns:
        Dict mapping movieId -> {movieId, imdbId, tmdbId, imdbUrl, tmdbUrl}
    """
    result: Dict[int, dict] = {}
    csv_path = settings.RAW_DATA_DIR / "links.csv"
    if not csv_path.exists():
        logger.warning(f"links.csv not found: {csv_path}")
        return result

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    movie_id = int(row["movieId"])
                    imdb_raw = row.get("imdbId", "").strip()
                    tmdb_raw = row.get("tmdbId", "").strip()
                    # IMDb ids typically require 7 digits formatted as tt0000000
                    imdb_formatted = imdb_raw.zfill(7) if imdb_raw and imdb_raw.isdigit() else imdb_raw
                    imdb_url = f"https://www.imdb.com/title/tt{imdb_formatted}/" if imdb_formatted else None
                    tmdb_url = f"https://www.themoviedb.org/movie/{tmdb_raw}" if tmdb_raw else None
                    result[movie_id] = {
                        "movieId": movie_id,
                        "imdbId": imdb_formatted or None,
                        "tmdbId": tmdb_raw or None,
                        "imdbUrl": imdb_url,
                        "tmdbUrl": tmdb_url,
                    }
                except (ValueError, KeyError):
                    continue
        logger.info(f"✓ Loaded links for {len(result)} movies from {csv_path.name}")
    except Exception as e:
        logger.error(f"Error loading links.csv: {e}")

    return result


def load_movies() -> Dict[int, dict]:
    """
    Parse movies.csv from the raw MovieLens dataset.

    Expected CSV columns: movieId, title, genres
    Genres are pipe-separated (e.g. "Action|Adventure|Sci-Fi").
    Extracts release year from title.

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
                title = row["title"].strip()
                genres_str = row.get("genres", "(no genres listed)").strip()
                genre_list = [g.strip() for g in genres_str.split("|") if g.strip() and g != "(no genres listed)"]
                year = extract_year(title)
                result[movie_id] = {
                    "movieId": movie_id,
                    "title": title,
                    "genres": genres_str,
                    "genreList": genre_list,
                    "year": year,
                }
        logger.info(f"✓ Loaded {len(result)} movies from {csv_path.name}")
    except Exception as e:
        logger.error(f"Error loading movies: {e}")

    return result


def load_average_ratings() -> Dict[int, dict]:
    """
    Parse the AverageRating MapReduce output across all reducer partitions.

    Expected TSV format: movieId \\t avgRating \\t ratingCount

    Returns:
        Dict mapping movieId to {avgRating, ratingCount}.
    """
    result: Dict[int, dict] = {}
    output_dir = settings.DATA_DIR / "avgrating"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Average ratings output partitions not found in {output_dir}")
        return result

    try:
        for fields in rows:
            if len(fields) >= 2:
                movie_id = int(fields[0].strip())
                if len(fields) >= 3:
                    avg_rating = float(fields[1].strip())
                    rating_count = int(fields[2].strip())
                else:
                    parts = fields[1].strip().split(",")
                    avg_rating = float(parts[0].strip())
                    rating_count = int(parts[1].strip()) if len(parts) > 1 else 0

                result[movie_id] = {
                    "movieId": movie_id,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                }
        logger.info(f"✓ Loaded average ratings for {len(result)} movies across partitions")
    except Exception as e:
        logger.error(f"Error loading average ratings: {e}")

    return result


def load_most_rated() -> List[dict]:
    """
    Parse the MostRated MapReduce output across all reducer partitions.

    Expected TSV format: movieId \\t ratingCount
    Returns list sorted descending by ratingCount.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "mostrated"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Most rated output partitions not found in {output_dir}")
        return result

    try:
        for fields in rows:
            if len(fields) >= 2:
                movie_id = int(fields[0].strip())
                count = int(fields[1].strip())
                result.append({"movieId": movie_id, "ratingCount": count})
        result.sort(key=lambda x: x["ratingCount"], reverse=True)
        logger.info(f"✓ Loaded most-rated data for {len(result)} movies across partitions")
    except Exception as e:
        logger.error(f"Error loading most rated: {e}")

    return result


def load_rating_distribution() -> List[dict]:
    """
    Parse the RatingDistribution MapReduce output.

    Expected TSV format: rating \\t count
    (e.g., "4.0\\t26818")

    Returns:
        List of {rating (str), count (int), percentage (float)} dicts sorted by rating.
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "ratingdist"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Rating distribution output not found in {output_dir}")
        return result

    try:
        total_count = 0
        for fields in rows:
            if len(fields) >= 2:
                rating_val = fields[0].strip()
                count = int(fields[1].strip())
                result.append({"rating": rating_val, "count": count})
                total_count += count

        # Sort by numerical rating value
        result.sort(key=lambda x: float(x["rating"]))

        # Compute accurate percentage
        for r in result:
            r["percentage"] = round((r["count"] / total_count) * 100, 2) if total_count > 0 else 0.0

        logger.info(f"✓ Loaded rating distribution with {len(result)} buckets (total ratings: {total_count})")
    except Exception as e:
        logger.error(f"Error loading rating distribution: {e}")

    return result


def load_genre_popularity() -> List[dict]:
    """
    Parse the GenrePopularity MapReduce output across partitions.

    Expected TSV format: genre \\t movieCount \\t ratingCount \\t avgRating
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "genrepop"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Genre popularity output not found in {output_dir}")
        return result

    try:
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
        logger.info(f"✓ Loaded genre popularity for {len(result)} genres across partitions")
    except Exception as e:
        logger.error(f"Error loading genre popularity: {e}")

    return result


def load_year_ratings() -> List[dict]:
    """
    Parse the YearRating MapReduce output across partitions.

    Expected TSV format: year \\t avgRating \\t ratingCount (\\t movieCount optional)
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "yearrating"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Year ratings output not found in {output_dir}")
        return result

    try:
        for fields in rows:
            if len(fields) >= 2:
                year = fields[0].strip()
                avg_rating = float(fields[1].strip())
                rating_count = int(fields[2].strip()) if len(fields) >= 3 else 0
                movie_count = int(fields[3].strip()) if len(fields) >= 4 else 0
                result.append({
                    "year": year,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                    "movieCount": movie_count,
                })
        # Sort by year (putting 'Unknown' at the end)
        def sort_year_key(item):
            y_str = item["year"]
            try:
                return (0, int(y_str))
            except ValueError:
                return (1, 9999)
        result.sort(key=sort_year_key)
        logger.info(f"✓ Loaded year ratings for {len(result)} years across partitions")
    except Exception as e:
        logger.error(f"Error loading year ratings: {e}")

    return result


def load_hidden_gems() -> List[dict]:
    """
    Parse the HiddenGems MapReduce output across partitions.

    Expected TSV format: movieId \\t avgRating \\t ratingCount \\t score
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "hiddengems"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Hidden gems output not found in {output_dir}")
        return result

    try:
        for fields in rows:
            if len(fields) >= 3:
                movie_id = int(fields[0].strip())
                avg_rating = float(fields[1].strip())
                rating_count = int(fields[2].strip())
                if len(fields) >= 4:
                    score = float(fields[3].strip())
                else:
                    score = round(avg_rating / math.log2(rating_count + 2), 4)

                result.append({
                    "movieId": movie_id,
                    "avgRating": round(avg_rating, 4),
                    "ratingCount": rating_count,
                    "hiddenGemScore": round(score, 4),
                })
        result.sort(key=lambda x: x["hiddenGemScore"], reverse=True)
        logger.info(f"✓ Loaded {len(result)} hidden gems across partitions")
    except Exception as e:
        logger.error(f"Error loading hidden gems: {e}")

    return result


def load_rating_trends() -> List[dict]:
    """
    Parse the RatingTrends MapReduce output across partitions.

    Expected TSV format: yearMonth \\t count \\t avgRating
    """
    result: List[dict] = []
    output_dir = settings.DATA_DIR / "ratingtrends"
    rows = _read_tsv_partitions(output_dir)

    if not rows:
        logger.warning(f"Rating trends output not found in {output_dir}")
        return result

    try:
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
        logger.info(f"✓ Loaded rating trends for {len(result)} months across partitions")
    except Exception as e:
        logger.error(f"Error loading rating trends: {e}")

    return result


# ╔══════════════════════════════════════════════════════════════╗
# ║  Raw Ingestion & Distribution Builder                        ║
# ╚══════════════════════════════════════════════════════════════╝

def _ingest_ratings_csv() -> Tuple[int, int, float, Dict[int, Dict[str, int]]]:
    """
    Scan ratings.csv to count unique users, total ratings, global average,
    and build individual per-movie rating distributions (0.5 to 5.0 stars).

    Returns:
        Tuple of (unique_users, total_ratings, global_avg, movie_rating_distributions)
    """
    ratings_path = settings.RAW_DATA_DIR / "ratings.csv"
    if not ratings_path.exists():
        logger.warning(f"Ratings file not found: {ratings_path}")
        return 0, 0, 0.0, {}

    users = set()
    total_count = 0
    rating_sum = 0.0
    distributions: Dict[int, Dict[str, int]] = {}

    # Valid half-star keys
    valid_buckets = ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"]

    try:
        with open(ratings_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    user_id = row["userId"]
                    movie_id = int(row["movieId"])
                    rating_float = float(row["rating"])
                except (ValueError, KeyError):
                    continue

                users.add(user_id)
                total_count += 1
                rating_sum += rating_float

                if movie_id not in distributions:
                    distributions[movie_id] = {k: 0 for k in valid_buckets}

                rating_key = f"{rating_float:.1f}"
                if rating_key in distributions[movie_id]:
                    distributions[movie_id][rating_key] += 1
                else:
                    # In case of unconventional star format
                    distributions[movie_id][rating_key] = distributions[movie_id].get(rating_key, 0) + 1

        avg = round(rating_sum / total_count, 4) if total_count > 0 else 0.0
        logger.info(f"✓ Ingested ratings.csv: {len(users)} users, {total_count} ratings, avg={avg}")
        return len(users), total_count, avg, distributions
    except Exception as e:
        logger.error(f"Error reading ratings.csv: {e}")
        return 0, 0, 0.0, {}


def _compute_weighted_rating(avg_rating: float, count: int,
                             global_avg: float, min_votes: int = 10) -> float:
    """
    Calculate a Bayesian weighted rating (IMDb / True-Bayes formula).

    Formula: WR = (v / (v + m)) * R  +  (m / (v + m)) * C
    where:
        v = rating count for this movie
        m = minimum rating threshold (10)
        R = average rating for this movie
        C = global average rating across all movies
    """
    if count == 0:
        return 0.0
    return round(
        (count / (count + min_votes)) * avg_rating +
        (min_votes / (count + min_votes)) * global_avg,
        4,
    )


def load_jobs_metadata() -> None:
    """
    Load job metadata from data/processed/jobs.json.
    Establishes execution provenance (engine, processedAt, recorded jobs).
    Does NOT invent or fabricate jobs if jobs.json does not exist.
    """
    global provenance_info
    jobs_file = settings.DATA_DIR / "jobs.json"
    if jobs_file.exists():
        try:
            with open(jobs_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, dict):
                job_list = data.get("jobs", [])
                processed_at = data.get("processedAt")
                mode = data.get("mode", "local-simulation")
                note = data.get("note", "Local MapReduce simulation")
            elif isinstance(data, list):
                job_list = data
                processed_at = None
                mode = "offline"
                note = "Loaded from jobs list"
            else:
                job_list = []
                processed_at = None
                mode = "offline"
                note = "No jobs record"

            # Determine genuine engine type
            engine = "hadoop" if mode == "hadoop-cluster" else "python-reference"
            provenance_info["jobs"] = job_list
            provenance_info["processedAt"] = processed_at
            provenance_info["mode"] = mode
            provenance_info["note"] = note
            provenance_info["engine"] = engine
            logger.info(f"✓ Loaded job provenance: mode={mode}, engine={engine}, jobs={len(job_list)}")
        except Exception as e:
            logger.error(f"Error reading jobs.json: {e}")
    else:
        provenance_info["jobs"] = []
        provenance_info["note"] = "No jobs.json metadata found; raw MapReduce partition outputs used"


# ╔══════════════════════════════════════════════════════════════╗
# ║  Master Initialization                                       ║
# ╚══════════════════════════════════════════════════════════════╝

def init_data() -> None:
    """
    Load all data sources and merge them into the module-level caches.
    Called once at application startup from main.py's lifespan handler.
    """
    global movies, links, average_ratings, most_rated, rating_distribution
    global genre_popularity, year_ratings, hidden_gems, rating_trends
    global movie_rating_distributions, all_movies, global_stats, all_genres
    global last_loaded, provenance_info

    logger.info("=" * 60)
    logger.info("CineMetrics Data Loader — Starting initialization...")
    logger.info(f"  Raw data dir:       {settings.RAW_DATA_DIR}")
    logger.info(f"  Processed data dir: {settings.DATA_DIR}")
    logger.info("=" * 60)

    # Step 1: Load raw movie metadata & links
    movies = load_movies()
    links = load_links()

    # Step 2: Load each MapReduce output across partitions
    average_ratings = load_average_ratings()
    most_rated = load_most_rated()
    rating_distribution = load_rating_distribution()
    genre_popularity = load_genre_popularity()
    year_ratings = load_year_ratings()
    hidden_gems = load_hidden_gems()
    rating_trends = load_rating_trends()

    # Step 3: Load jobs metadata and provenance
    load_jobs_metadata()

    # Step 4: Ingest ratings.csv to get users, totals, and per-movie distributions
    unique_users, total_ratings, global_avg, movie_rating_distributions = _ingest_ratings_csv()

    # Fallback totals from average_ratings if ratings.csv was missing
    if total_ratings == 0 and average_ratings:
        total_ratings = sum(r["ratingCount"] for r in average_ratings.values())
        if total_ratings > 0:
            rating_sum = sum(r["avgRating"] * r["ratingCount"] for r in average_ratings.values())
            global_avg = round(rating_sum / total_ratings, 4)

    # Step 5: Build hidden gem lookup
    hidden_gem_map = {g["movieId"]: g for g in hidden_gems}

    # Step 6: Merge everything into all_movies
    merged: List[dict] = []
    genre_set: set = set()

    for movie_id, movie in movies.items():
        record = {**movie}

        # Attach link identifiers
        link_data = links.get(movie_id, {})
        record["imdbId"] = link_data.get("imdbId")
        record["tmdbId"] = link_data.get("tmdbId")
        record["imdbUrl"] = link_data.get("imdbUrl")
        record["tmdbUrl"] = link_data.get("tmdbUrl")

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
                record["avgRating"], record["ratingCount"], global_avg, min_votes=10
            )
        else:
            record["weightedRating"] = None

        # Mark hidden gems
        if movie_id in hidden_gem_map:
            record["isHiddenGem"] = True
            record["hiddenGemScore"] = hidden_gem_map[movie_id]["hiddenGemScore"]
        else:
            record["isHiddenGem"] = False
            record["hiddenGemScore"] = None

        # Collect unique genres
        for g in record.get("genreList", []):
            genre_set.add(g)

        merged.append(record)

    # Step 7: Precompute ranks for fast lookup
    # Rank by ratingCount descending
    rated_by_count = sorted([m for m in merged if (m.get("ratingCount") or 0) > 0],
                            key=lambda m: m["ratingCount"], reverse=True)
    count_rank_map = {m["movieId"]: rank + 1 for rank, m in enumerate(rated_by_count)}

    # Rank by avgRating descending (min 10 votes)
    rated_by_avg = sorted([m for m in merged if (m.get("avgRating") is not None) and (m.get("ratingCount") or 0) >= 10],
                          key=lambda m: (m["avgRating"], m["ratingCount"]), reverse=True)
    avg_rank_map = {m["movieId"]: rank + 1 for rank, m in enumerate(rated_by_avg)}

    for m in merged:
        m_id = m["movieId"]
        m["rankMostRated"] = count_rank_map.get(m_id)
        m["globalRankAvg"] = avg_rank_map.get(m_id)

    all_movies = merged
    all_genres = genre_set

    # Step 8: Enrich hidden gems with movie metadata (title, genres, year, links)
    for gem in hidden_gems:
        m_id = gem["movieId"]
        movie = movies.get(m_id)
        link_data = links.get(m_id, {})
        if movie:
            gem["title"] = movie["title"]
            gem["genres"] = movie["genres"]
            gem["year"] = movie.get("year")
        else:
            gem["title"] = f"Unknown (ID: {m_id})"
            gem["genres"] = ""
            gem["year"] = None
        gem["imdbUrl"] = link_data.get("imdbUrl")
        gem["tmdbUrl"] = link_data.get("tmdbUrl")
        # Ensure weightedScore alias is present
        ar = average_ratings.get(m_id)
        if ar and ar.get("avgRating") is not None:
            gem["weightedScore"] = _compute_weighted_rating(ar["avgRating"], ar["ratingCount"], global_avg, min_votes=10)
        else:
            gem["weightedScore"] = gem["hiddenGemScore"]

    # Step 9: Enrich most_rated with movie metadata
    for mr in most_rated:
        m_id = mr["movieId"]
        movie = movies.get(m_id)
        link_data = links.get(m_id, {})
        if movie:
            mr["title"] = movie["title"]
            mr["genres"] = movie["genres"]
            mr["year"] = movie.get("year")
            mr["genreList"] = movie.get("genreList", [])
        if m_id in average_ratings:
            mr["avgRating"] = average_ratings[m_id]["avgRating"]
        mr["imdbUrl"] = link_data.get("imdbUrl")

    # Step 10: Build global stats
    genre_count = len(genre_popularity) if genre_popularity else len(genre_set)

    global_stats = {
        "totalMovies": len(movies),
        "totalRatings": total_ratings,
        "uniqueUsers": unique_users,
        "globalAverageRating": global_avg,
        "genreCount": genre_count,
    }

    last_loaded = datetime.now(timezone.utc).isoformat()
    provenance_info["apiLoadedAt"] = last_loaded

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
    Find the highest-rated movie with at least `min_ratings` ratings.
    """
    candidates = [
        m for m in all_movies
        if m.get("avgRating") is not None and (m.get("ratingCount") or 0) >= min_ratings
    ]
    if not candidates:
        return None

    best = max(candidates, key=lambda m: (m["avgRating"], m["ratingCount"]))
    return {
        "movieId": best["movieId"],
        "title": best["title"],
        "avgRating": best["avgRating"],
        "ratingCount": best["ratingCount"],
        "genres": best.get("genres"),
        "year": best.get("year"),
    }
