#!/usr/bin/env python3
"""
==============================================================================
CineMetrics — PySpark Syllabus Extension: Movie Ratings Analytics
==============================================================================

Academic Context:
  Course: Big Data Essentials (21CSC314P)
  Degree: B.Tech Information Technology
  Institution: SRM Institute of Science and Technology, Ramapuram
  Developer: Achyuth PV

Purpose:
  Provides an equivalent analytics implementation using Apache Spark (PySpark)
  for direct algorithmic and runtime comparison against Hadoop MapReduce.

Comparison Highlights (Viva Demonstration):
  ┌───────────────────────┬─────────────────────────┬─────────────────────────┐
  │ Feature               │ Hadoop MapReduce        │ Apache Spark            │
  ├───────────────────────┼─────────────────────────┼─────────────────────────┤
  │ Execution Paradigm    │ Disk-based 2-stage      │ In-memory DAG (RDDs)    │
  │ Intermediate Storage  │ Local Disk Spills       │ RAM / Memory Cache      │
  │ Iterative Algorithms  │ High I/O overhead       │ Up to 10-100x faster    │
  │ Data Abstraction      │ Key-Value Pairs         │ DataFrames & RDDs       │
  │ Language Support      │ Java (Low-level Writable) Python / Scala / SQL   │
  └───────────────────────┴─────────────────────────┴─────────────────────────┘
==============================================================================
"""

import sys
import time
from pathlib import Path

try:
    from pyspark.sql import SparkSession
    from pyspark.sql.functions import col, avg, count, round as spark_round, desc
except ImportError:
    print("[NOTE] PySpark is not installed in this environment.")
    print("To run this syllabus extension, execute: pip install pyspark")
    sys.exit(0)


def run_spark_analytics(data_dir: str):
    print("=" * 70)
    print("  CineMetrics — PySpark Analytics Benchmark")
    print("=" * 70)

    start_time = time.time()

    # 1. Initialize SparkSession (local mode)
    spark = SparkSession.builder \
        .appName("CineMetrics-PySpark-Analytics") \
        .master("local[*]") \
        .config("spark.driver.memory", "1g") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    print(f"✓ Spark Session initialized ({time.time() - start_time:.2f}s)")

    # 2. Ingest ratings.csv and movies.csv
    ratings_path = str(Path(data_dir) / "ratings.csv")
    movies_path = str(Path(data_dir) / "movies.csv")

    ratings_df = spark.read.csv(ratings_path, header=True, inferSchema=True)
    movies_df = spark.read.csv(movies_path, header=True, inferSchema=True)

    # 3. Job 1 & 2 Equivalent: Average Rating & Most Rated per Movie
    print("\n--- Running Job 1 & 2 Equivalent (Average & Count) ---")
    movie_stats = ratings_df.groupBy("movieId") \
        .agg(
            spark_round(avg("rating"), 4).alias("avgRating"),
            count("rating").alias("ratingCount")
        )

    # Join with movies.csv for title metadata
    top_movies = movie_stats.join(movies_df, "movieId") \
        .orderBy(desc("ratingCount"))

    print("\nTop 5 Most Rated Movies (Spark):")
    top_movies.select("movieId", "title", "ratingCount", "avgRating").show(5, truncate=False)

    # 4. Job 3 Equivalent: Rating Distribution
    print("\n--- Running Job 3 Equivalent (Distribution) ---")
    dist = ratings_df.groupBy("rating").count().orderBy("rating")
    dist.show()

    # Total execution time
    elapsed = time.time() - start_time
    print(f"\n✓ PySpark Processing Complete in {elapsed:.2f} seconds.")
    spark.stop()


if __name__ == "__main__":
    raw_dir = Path(__file__).resolve().parent.parent / "data" / "raw"
    if (raw_dir / "ratings.csv").exists():
        run_spark_analytics(str(raw_dir))
    else:
        print(f"Raw data directory not found at {raw_dir}")
