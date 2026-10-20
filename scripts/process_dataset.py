#!/usr/bin/env python3
"""
==============================================================================
CineMetrics — Local MapReduce Simulation & Data Processing Pipeline
==============================================================================

This script processes the MovieLens dataset using a LOCAL MapReduce simulation
that exactly mirrors the logic of our Hadoop Java MapReduce jobs.

PURPOSE:
  - Allows development and testing without a running Hadoop cluster
  - Produces IDENTICAL output format to the Hadoop MapReduce jobs
  - Validates that our MapReduce logic is correct
  - Generates the processed JSON files consumed by the backend API

IMPORTANT ACADEMIC NOTE:
  This script is a REFERENCE IMPLEMENTATION for development convenience.
  The PRODUCTION analytics engine is Apache Hadoop MapReduce (see hadoop/ directory).
  Both produce the same results because they implement the same algorithms.

  For your viva: This script helps verify correctness. The real distributed
  processing happens via the Java MapReduce jobs on Hadoop YARN.

Usage:
  python process_dataset.py                          # Process with defaults
  python process_dataset.py --input data/raw/ml-latest-small --output data/processed

Developer: Achyuth PV
Course: Big Data Essentials (21CSC314P), SRM Ramapuram
==============================================================================
"""

import csv
import json
import os
import sys
import re
import logging
import argparse
from datetime import datetime, timezone
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

# ============================================================================
# LOGGING SETUP
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("CineMetrics")


# ============================================================================
# CSV PARSING UTILITIES
# ============================================================================
def parse_csv_file(filepath: str, expected_headers: List[str] = None) -> List[Dict]:
    """
    Parse a CSV file with robust handling for:
    - Quoted fields containing commas
    - Escaped quotes (double-quote within quotes)
    - Missing values
    - Malformed records (logged and skipped)

    Args:
        filepath: Path to the CSV file
        expected_headers: Optional list of expected column names for validation

    Returns:
        List of dictionaries, one per valid row
    """
    records = []
    malformed_count = 0

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            if expected_headers:
                actual = set(reader.fieldnames or [])
                expected = set(expected_headers)
                if not expected.issubset(actual):
                    missing = expected - actual
                    logger.warning(f"Missing columns in {filepath}: {missing}")

            for line_num, row in enumerate(reader, start=2):
                try:
                    # Skip completely empty rows
                    if all(v is None or v.strip() == '' for v in row.values()):
                        continue
                    records.append(row)
                except Exception as e:
                    malformed_count += 1
                    if malformed_count <= 5:
                        logger.warning(f"Malformed record at line {line_num} in {filepath}: {e}")

    except FileNotFoundError:
        logger.error(f"File not found: {filepath}")
        return []

    if malformed_count > 0:
        logger.warning(f"Total malformed records in {filepath}: {malformed_count}")

    logger.info(f"Parsed {len(records)} records from {filepath}")
    return records


def extract_year_from_title(title: str) -> Optional[int]:
    """
    Extract release year from a movie title like 'Toy Story (1995)'.

    Handles edge cases:
    - Multiple years in title: takes the last one
    - No year: returns None
    - Year outside reasonable range (1880-2030): returns None
    """
    matches = re.findall(r'\((\d{4})\)', title)
    if matches:
        year = int(matches[-1])
        if 1880 <= year <= 2030:
            return year
    return None


# ============================================================================
# MAPREDUCE JOB SIMULATIONS
# These functions mirror the exact logic of the Java MapReduce jobs.
# Each function documents the Mapper → Combiner → Reducer pipeline.
# ============================================================================

def job_average_rating(ratings: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 1: Average Movie Rating                                    ║
    ║                                                                  ║
    ║  Mapper:   (line) → emit(movieId, rating)                       ║
    ║  Combiner: (movieId, [r1,r2,...]) → emit(movieId, (sum, count)) ║
    ║  Reducer:  (movieId, [(s1,c1), ...]) → avg = totalSum/totalCnt  ║
    ║                                                                  ║
    ║  Output: movieId, averageRating, ratingCount                    ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 1: Average Movie Rating")

    # === MAP PHASE ===
    # Emit movieId → rating for each record
    movie_data = defaultdict(lambda: {'sum': 0.0, 'count': 0})

    for record in ratings:
        try:
            movie_id = int(record['movieId'])
            rating = float(record['rating'])
            # === COMBINE/REDUCE PHASE ===
            movie_data[movie_id]['sum'] += rating
            movie_data[movie_id]['count'] += 1
        except (ValueError, KeyError) as e:
            continue  # Skip malformed records

    # === OUTPUT ===
    results = []
    for movie_id, data in sorted(movie_data.items()):
        avg = round(data['sum'] / data['count'], 4) if data['count'] > 0 else 0
        results.append({
            'movieId': movie_id,
            'averageRating': avg,
            'ratingCount': data['count']
        })

    logger.info(f"  → Computed average ratings for {len(results)} movies")
    return results


def job_most_rated(ratings: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 2: Most Rated Movies                                      ║
    ║                                                                  ║
    ║  Mapper:   (line) → emit(movieId, 1)                            ║
    ║  Combiner: (movieId, [1,1,...]) → emit(movieId, partialCount)   ║
    ║  Reducer:  (movieId, [c1,c2,...]) → totalCount                  ║
    ║                                                                  ║
    ║  Output: movieId, totalRatings (sorted descending)              ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 2: Most Rated Movies")

    # === MAP + COMBINE + REDUCE ===
    movie_counts = defaultdict(int)
    for record in ratings:
        try:
            movie_id = int(record['movieId'])
            movie_counts[movie_id] += 1
        except (ValueError, KeyError):
            continue

    # Sort by count descending
    results = [
        {'movieId': mid, 'totalRatings': count}
        for mid, count in sorted(movie_counts.items(), key=lambda x: -x[1])
    ]

    logger.info(f"  → Ranked {len(results)} movies by rating count")
    return results


def job_rating_distribution(ratings: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 3: Rating Distribution                                    ║
    ║                                                                  ║
    ║  Mapper:   (line) → emit(ratingValue, 1)                       ║
    ║  Combiner: (ratingValue, [1,1,...]) → emit(ratingValue, sum)   ║
    ║  Reducer:  (ratingValue, [c1,c2,...]) → totalFrequency         ║
    ║                                                                  ║
    ║  Output: ratingValue, frequency                                 ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 3: Rating Distribution")

    # Valid half-star intervals
    valid_ratings = {0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0}
    distribution = defaultdict(int)

    for record in ratings:
        try:
            rating = float(record['rating'])
            if rating in valid_ratings:
                distribution[rating] += 1
            else:
                logger.warning(f"Invalid rating value: {rating}")
        except (ValueError, KeyError):
            continue

    results = [
        {'rating': str(r), 'count': distribution[r]}
        for r in sorted(valid_ratings)
    ]

    logger.info(f"  → Computed distribution for {len(results)} rating values")
    return results


def job_genre_popularity(ratings: List[Dict], movies: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 4: Genre Popularity                                        ║
    ║                                                                  ║
    ║  Setup:    Load movies.csv into DistributedCache (map-side join)║
    ║  Mapper:   For each rating, look up movie genres.               ║
    ║            For each genre: emit(genre, "movieId,rating")        ║
    ║  Reducer:  Collect all (movieId, rating) pairs per genre.       ║
    ║            Count unique movies, total ratings, compute avg.     ║
    ║                                                                  ║
    ║  Output: genre, uniqueMovieCount, totalRatings, avgRating      ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 4: Genre Popularity")

    # === SETUP: Build movie → genres lookup (DistributedCache simulation) ===
    movie_genres = {}
    for movie in movies:
        try:
            movie_id = int(movie['movieId'])
            genres = movie.get('genres', '(no genres listed)')
            if genres and genres != '(no genres listed)':
                movie_genres[movie_id] = genres.split('|')
            else:
                movie_genres[movie_id] = ['(no genres listed)']
        except (ValueError, KeyError):
            continue

    # === MAP + REDUCE ===
    genre_data = defaultdict(lambda: {
        'movies': set(),
        'rating_sum': 0.0,
        'rating_count': 0
    })

    for record in ratings:
        try:
            movie_id = int(record['movieId'])
            rating = float(record['rating'])
            genres = movie_genres.get(movie_id, ['Unknown'])

            for genre in genres:
                genre_data[genre]['movies'].add(movie_id)
                genre_data[genre]['rating_sum'] += rating
                genre_data[genre]['rating_count'] += 1
        except (ValueError, KeyError):
            continue

    # === OUTPUT ===
    results = []
    for genre, data in sorted(genre_data.items(), key=lambda x: -x[1]['rating_count']):
        avg = round(data['rating_sum'] / data['rating_count'], 4) if data['rating_count'] > 0 else 0
        results.append({
            'genre': genre,
            'movieCount': len(data['movies']),
            'ratingCount': data['rating_count'],
            'avgRating': avg
        })

    logger.info(f"  → Analyzed {len(results)} genres")
    return results


def job_year_rating(ratings: List[Dict], movies: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 5: Ratings by Release Year                                ║
    ║                                                                  ║
    ║  Setup:    Load movies.csv to extract year from title           ║
    ║  Mapper:   Look up movie year, emit(year, rating)              ║
    ║  Combiner: Aggregate partial (sum, count) per year             ║
    ║  Reducer:  Compute ratingCount, avgRating per year             ║
    ║                                                                  ║
    ║  Output: year, ratingCount, avgRating                          ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 5: Ratings by Release Year")

    # === SETUP: Build movie → year lookup ===
    movie_years = {}
    for movie in movies:
        try:
            movie_id = int(movie['movieId'])
            year = extract_year_from_title(movie.get('title', ''))
            movie_years[movie_id] = year
        except (ValueError, KeyError):
            continue

    # === MAP + COMBINE + REDUCE ===
    year_data = defaultdict(lambda: {'sum': 0.0, 'count': 0, 'movies': set()})

    for record in ratings:
        try:
            movie_id = int(record['movieId'])
            rating = float(record['rating'])
            year = movie_years.get(movie_id)
            year_key = str(year) if year else "Unknown"

            year_data[year_key]['sum'] += rating
            year_data[year_key]['count'] += 1
            year_data[year_key]['movies'].add(movie_id)
        except (ValueError, KeyError):
            continue

    results = []
    for year, data in sorted(year_data.items()):
        avg = round(data['sum'] / data['count'], 4) if data['count'] > 0 else 0
        results.append({
            'year': year,
            'movieCount': len(data['movies']),
            'ratingCount': data['count'],
            'avgRating': avg
        })

    logger.info(f"  → Analyzed ratings across {len(results)} release years")
    return results


def job_hidden_gems(ratings: List[Dict], movies: List[Dict],
                     min_ratings: int = 5, max_ratings: int = 50,
                     min_avg: float = 4.0, m: int = 10, C: float = 3.5) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 6: Hidden Gems — Underrated Movies Discovery              ║
    ║                                                                  ║
    ║  Mapper:   emit(movieId, rating)                                ║
    ║  Combiner: Aggregate (sum, count) per movie                    ║
    ║  Reducer:  Compute avg. Apply Bayesian weighted score:         ║
    ║            WR = (v/(v+m)) * R + (m/(v+m)) * C                  ║
    ║            where v=votes, R=avg rating, m=min votes, C=mean    ║
    ║            Filter: minRatings <= count <= maxRatings, avg>=4.0  ║
    ║                                                                  ║
    ║  Output: movieId, avgRating, ratingCount, weightedScore        ║
    ╚══════════════════════════════════════════════════════════════════╝

    Bayesian Weighted Rating prevents movies with very few ratings
    from dominating the "best rated" list. A movie with one 5-star
    rating isn't necessarily better than one with fifty 4.5-star ratings.
    """
    logger.info("Running Job 6: Hidden Gems")
    logger.info(f"  Parameters: minRatings={min_ratings}, maxRatings={max_ratings}, "
                f"minAvg={min_avg}, m={m}, C={C}")

    # Build movie lookup for metadata
    movie_lookup = {}
    for movie in movies:
        try:
            movie_lookup[int(movie['movieId'])] = {
                'title': movie.get('title', 'Unknown'),
                'genres': movie.get('genres', '')
            }
        except (ValueError, KeyError):
            continue

    # === MAP + REDUCE ===
    movie_data = defaultdict(lambda: {'sum': 0.0, 'count': 0})
    for record in ratings:
        try:
            movie_id = int(record['movieId'])
            rating = float(record['rating'])
            movie_data[movie_id]['sum'] += rating
            movie_data[movie_id]['count'] += 1
        except (ValueError, KeyError):
            continue

    # === FILTER + SCORE ===
    results = []
    for movie_id, data in movie_data.items():
        v = data['count']
        R = data['sum'] / v if v > 0 else 0

        if min_ratings <= v <= max_ratings and R >= min_avg:
            # Bayesian weighted score
            weighted = (v / (v + m)) * R + (m / (v + m)) * C
            meta = movie_lookup.get(movie_id, {'title': 'Unknown', 'genres': ''})
            results.append({
                'movieId': movie_id,
                'title': meta['title'],
                'genres': meta['genres'],
                'avgRating': round(R, 4),
                'ratingCount': v,
                'weightedScore': round(weighted, 4)
            })

    # Sort by weighted score descending
    results.sort(key=lambda x: -x['weightedScore'])

    logger.info(f"  → Found {len(results)} hidden gems")
    return results


def job_rating_trends(ratings: List[Dict]) -> List[Dict]:
    """
    ╔══════════════════════════════════════════════════════════════════╗
    ║  JOB 7: Rating Trends Over Time                                ║
    ║                                                                  ║
    ║  Mapper:   Convert timestamp → YYYY-MM, emit(yearMonth, rating)║
    ║  Combiner: Aggregate partial (sum, count) per month            ║
    ║  Reducer:  Compute ratingCount, avgRating per month            ║
    ║                                                                  ║
    ║  NOTE: The timestamp is when the RATING was submitted, not     ║
    ║  the movie release date. This shows user activity over time.   ║
    ║                                                                  ║
    ║  Output: yearMonth, ratingCount, avgRating                     ║
    ╚══════════════════════════════════════════════════════════════════╝
    """
    logger.info("Running Job 7: Rating Trends Over Time")

    month_data = defaultdict(lambda: {'sum': 0.0, 'count': 0})

    for record in ratings:
        try:
            timestamp = int(record['timestamp'])
            rating = float(record['rating'])

            # Convert Unix timestamp to YYYY-MM
            dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
            year_month = dt.strftime('%Y-%m')

            month_data[year_month]['sum'] += rating
            month_data[year_month]['count'] += 1
        except (ValueError, KeyError, OSError):
            continue

    results = []
    for ym, data in sorted(month_data.items()):
        avg = round(data['sum'] / data['count'], 4) if data['count'] > 0 else 0
        results.append({
            'yearMonth': ym,
            'ratingCount': data['count'],
            'avgRating': avg
        })

    logger.info(f"  → Analyzed trends across {len(results)} months")
    return results


# ============================================================================
# OVERVIEW STATISTICS
# ============================================================================
def compute_overview(ratings: List[Dict], movies: List[Dict],
                     avg_ratings: List[Dict], genre_stats: List[Dict]) -> Dict:
    """Compute global overview statistics for the dashboard."""
    logger.info("Computing overview statistics")

    total_ratings = len(ratings)
    total_movies = len(movies)
    unique_users = len(set(r.get('userId', '') for r in ratings))

    # Global average rating
    if total_ratings > 0:
        global_avg = sum(float(r['rating']) for r in ratings) / total_ratings
    else:
        global_avg = 0.0

    genre_count = len(genre_stats)

    # Highest rated movie (with minimum 10 ratings for credibility)
    highest = None
    for movie in sorted(avg_ratings, key=lambda x: (-x['averageRating'], -x['ratingCount'])):
        if movie['ratingCount'] >= 10:
            highest = movie
            break

    # Build movie title lookup
    movie_lookup = {int(m['movieId']): m for m in movies}
    if highest:
        meta = movie_lookup.get(highest['movieId'], {})
        highest['title'] = meta.get('title', 'Unknown')
        highest['genres'] = meta.get('genres', '')

    return {
        'totalMovies': total_movies,
        'totalRatings': total_ratings,
        'uniqueUsers': unique_users,
        'globalAverageRating': round(global_avg, 4),
        'genreCount': genre_count,
        'highestRatedMovie': highest,
        'datasetInfo': {
            'name': 'MovieLens Latest Small',
            'version': 'latest-small',
            'source': 'https://grouplens.org/datasets/movielens/',
            'license': 'Research use permitted by GroupLens',
            'records': total_ratings,
            'movies': total_movies,
            'users': unique_users
        },
        'lastProcessed': datetime.now(timezone.utc).isoformat()
    }


# ============================================================================
# MOVIES WITH MERGED ANALYTICS
# ============================================================================
def build_movie_analytics(movies: List[Dict], avg_ratings: List[Dict],
                          most_rated: List[Dict]) -> List[Dict]:
    """Merge movie metadata with analytics results for the movie explorer."""
    logger.info("Building merged movie analytics")

    # Build lookups
    avg_lookup = {m['movieId']: m for m in avg_ratings}
    count_lookup = {m['movieId']: m['totalRatings'] for m in most_rated}

    # Compute global average for weighted rating
    all_counts = [m['ratingCount'] for m in avg_ratings if m['ratingCount'] > 0]
    C = sum(m['averageRating'] * m['ratingCount'] for m in avg_ratings) / sum(all_counts) if all_counts else 3.5
    m = 10  # minimum votes

    results = []
    for movie in movies:
        try:
            movie_id = int(movie['movieId'])
            title = movie.get('title', 'Unknown')
            genres = movie.get('genres', '(no genres listed)')
            year = extract_year_from_title(title)

            avg_data = avg_lookup.get(movie_id, {})
            avg_rating = avg_data.get('averageRating', 0)
            rating_count = avg_data.get('ratingCount', 0)

            # Bayesian weighted rating
            v = rating_count
            R = avg_rating
            weighted = round((v / (v + m)) * R + (m / (v + m)) * C, 4) if v > 0 else 0

            results.append({
                'movieId': movie_id,
                'title': title,
                'year': year,
                'genres': genres,
                'genreList': genres.split('|') if genres != '(no genres listed)' else [],
                'avgRating': avg_rating,
                'ratingCount': rating_count,
                'weightedRating': weighted
            })
        except (ValueError, KeyError):
            continue

    logger.info(f"  → Built analytics for {len(results)} movies")
    return results


# ============================================================================
# MAIN PIPELINE
# ============================================================================
def main():
    parser = argparse.ArgumentParser(
        description='CineMetrics — Process MovieLens dataset with MapReduce-equivalent analytics'
    )
    parser.add_argument('--input', default=None,
                        help='Path to MovieLens dataset directory (default: auto-detect)')
    parser.add_argument('--output', default=None,
                        help='Path for processed output (default: data/processed)')
    args = parser.parse_args()

    # Determine paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent if script_dir.name == 'scripts' else script_dir

    # Auto-detect input directory
    if args.input:
        input_dir = Path(args.input)
    else:
        candidates = [
            project_root / 'data' / 'raw' / 'ml-latest-small',
            project_root / 'data' / 'raw',
        ]
        input_dir = None
        for c in candidates:
            if (c / 'ratings.csv').exists():
                input_dir = c
                break
        if not input_dir:
            logger.error("Could not find MovieLens dataset. Please specify --input path.")
            logger.error("Download from: https://grouplens.org/datasets/movielens/")
            sys.exit(1)

    output_dir = Path(args.output) if args.output else project_root / 'data' / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 70)
    logger.info("  CineMetrics — Data Processing Pipeline")
    logger.info("=" * 70)
    logger.info(f"  Input:  {input_dir}")
    logger.info(f"  Output: {output_dir}")
    logger.info("=" * 70)

    # ========================================================================
    # STEP 1: Parse CSV files
    # ========================================================================
    logger.info("\n📂 STEP 1: Loading MovieLens dataset...")

    ratings = parse_csv_file(
        str(input_dir / 'ratings.csv'),
        expected_headers=['userId', 'movieId', 'rating', 'timestamp']
    )
    movies = parse_csv_file(
        str(input_dir / 'movies.csv'),
        expected_headers=['movieId', 'title', 'genres']
    )

    if not ratings:
        logger.error("No ratings data found. Aborting.")
        sys.exit(1)
    if not movies:
        logger.error("No movies data found. Aborting.")
        sys.exit(1)

    # ========================================================================
    # STEP 2: Run all MapReduce jobs
    # ========================================================================
    logger.info("\n🔄 STEP 2: Running MapReduce analytics jobs...\n")

    # Job 1: Average Rating
    avg_ratings = job_average_rating(ratings)

    # Job 2: Most Rated Movies
    most_rated = job_most_rated(ratings)

    # Job 3: Rating Distribution
    rating_dist = job_rating_distribution(ratings)

    # Job 4: Genre Popularity
    genre_pop = job_genre_popularity(ratings, movies)

    # Job 5: Ratings by Release Year
    year_ratings = job_year_rating(ratings, movies)

    # Job 6: Hidden Gems
    hidden_gems = job_hidden_gems(ratings, movies)

    # Job 7: Rating Trends
    rating_trends = job_rating_trends(ratings)

    # ========================================================================
    # STEP 3: Compute derived analytics
    # ========================================================================
    logger.info("\n📊 STEP 3: Computing derived analytics...\n")

    overview = compute_overview(ratings, movies, avg_ratings, genre_pop)
    movie_analytics = build_movie_analytics(movies, avg_ratings, most_rated)

    # ========================================================================
    # STEP 4: Write output files (Both JSON and MapReduce TSV formats)
    # ========================================================================
    logger.info("\n💾 STEP 4: Writing processed output files (JSON + MapReduce TSV)...\n")

    # 4a. Write JSON format files
    outputs = {
        'overview.json': overview,
        'movies.json': movie_analytics,
        'avg_ratings.json': avg_ratings,
        'most_rated.json': most_rated,
        'rating_distribution.json': rating_dist,
        'genre_popularity.json': genre_pop,
        'year_ratings.json': year_ratings,
        'hidden_gems.json': hidden_gems,
        'rating_trends.json': rating_trends,
    }

    for filename, data in outputs.items():
        filepath = output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        record_count = len(data) if isinstance(data, list) else 'object'
        logger.info(f"  ✅ {filename} ({record_count} records)")

    # 4b. Write Standard MapReduce TSV Part-Files (part-r-00000)
    # This enables backend data_loader to read genuine MapReduce directory structures
    mr_dirs = {
        'avgrating': [(f"{m['movieId']}\t{m['averageRating']}\t{m['ratingCount']}") for m in avg_ratings],
        'mostrated': [(f"{m['movieId']}\t{m['totalRatings']}") for m in most_rated],
        'ratingdist': [(f"{m['rating']}\t{m['count']}") for m in rating_dist],
        'genrepop': [(f"{m['genre']}\t{m['movieCount']}\t{m['ratingCount']}\t{m['avgRating']}") for m in genre_pop],
        'yearrating': [(f"{m['year']}\t{m['avgRating']}\t{m['ratingCount']}") for m in year_ratings],
        'hiddengems': [(f"{m['movieId']}\t{m['avgRating']}\t{m['ratingCount']}\t{m['weightedScore']}") for m in hidden_gems],
        'ratingtrends': [(f"{m['yearMonth']}\t{m['ratingCount']}\t{m['avgRating']}") for m in rating_trends],
    }

    for job_dir_name, lines in mr_dirs.items():
        job_dir = output_dir / job_dir_name
        job_dir.mkdir(parents=True, exist_ok=True)
        part_file = job_dir / "part-r-00000"
        with open(part_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines) + "\n")
        # Also touch _SUCCESS file as standard Hadoop MapReduce convention
        (job_dir / "_SUCCESS").touch()
        logger.info(f"  ✅ MapReduce folder {job_dir_name}/part-r-00000 ({len(lines)} records)")

    # Also write job metadata for the Hadoop monitor page
    job_metadata = {
        'jobs': [
            {
                'jobName': 'AverageMovieRating',
                'jobId': 'local_job_001',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(avg_ratings),
                'outputPath': 'data/processed/avg_ratings.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'MostRatedMovies',
                'jobId': 'local_job_002',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(most_rated),
                'outputPath': 'data/processed/most_rated.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'RatingDistribution',
                'jobId': 'local_job_003',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(rating_dist),
                'outputPath': 'data/processed/rating_distribution.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'GenrePopularity',
                'jobId': 'local_job_004',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(genre_pop),
                'outputPath': 'data/processed/genre_popularity.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'YearRatings',
                'jobId': 'local_job_005',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(year_ratings),
                'outputPath': 'data/processed/year_ratings.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'HiddenGems',
                'jobId': 'local_job_006',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(hidden_gems),
                'outputPath': 'data/processed/hidden_gems.json',
                'mode': 'local-simulation'
            },
            {
                'jobName': 'RatingTrends',
                'jobId': 'local_job_007',
                'status': 'SUCCEEDED',
                'startTime': datetime.now(timezone.utc).isoformat(),
                'endTime': datetime.now(timezone.utc).isoformat(),
                'duration': '< 1s (local mode)',
                'inputRecords': len(ratings),
                'outputRecords': len(rating_trends),
                'outputPath': 'data/processed/rating_trends.json',
                'mode': 'local-simulation'
            },
        ],
        'processedAt': datetime.now(timezone.utc).isoformat(),
        'mode': 'local-simulation',
        'note': 'Results generated by local MapReduce simulation. For production, use Hadoop YARN.'
    }

    with open(output_dir / 'jobs.json', 'w', encoding='utf-8') as f:
        json.dump(job_metadata, f, indent=2)
    logger.info(f"  ✅ jobs.json (job metadata)")

    # ========================================================================
    # STEP 5: Summary
    # ========================================================================
    logger.info("\n" + "=" * 70)
    logger.info("  ✨ CineMetrics Processing Complete!")
    logger.info("=" * 70)
    logger.info(f"  Total Movies:    {overview['totalMovies']}")
    logger.info(f"  Total Ratings:   {overview['totalRatings']}")
    logger.info(f"  Unique Users:    {overview['uniqueUsers']}")
    logger.info(f"  Global Avg:      {overview['globalAverageRating']}")
    logger.info(f"  Genres:          {overview['genreCount']}")
    logger.info(f"  Hidden Gems:     {len(hidden_gems)}")
    logger.info(f"  Time Periods:    {len(rating_trends)}")
    logger.info(f"  Output Dir:      {output_dir}")
    logger.info("=" * 70)


if __name__ == '__main__':
    main()
