/*
==============================================================================
CineMetrics — Apache Pig Latin Syllabus Extension: Movie Ratings Analysis
==============================================================================

Academic Context:
  Course: Big Data Essentials (21CSC314P)
  Degree: B.Tech Information Technology
  Institution: SRM Institute of Science and Technology, Ramapuram
  Developer: Achyuth PV

Purpose:
  High-level dataflow language script (Pig Latin) demonstrating declarative
  ETL and aggregation compiled into underlying MapReduce DAGs by the Pig compiler.

Usage:
  pig -x local scripts/rating_analysis.pig
  OR in cluster mode:
  pig -x mapreduce scripts/rating_analysis.pig
==============================================================================
*/

-- 1. Load raw ratings dataset from CSV
ratings_raw = LOAD 'data/raw/ratings.csv' USING PigStorage(',') 
    AS (userId:int, movieId:int, rating:float, timestamp:long);

-- Filter out the CSV header row
ratings = FILTER ratings_raw BY userId IS NOT NULL;

-- 2. Load movies metadata dataset
movies_raw = LOAD 'data/raw/movies.csv' USING PigStorage(',') 
    AS (movieId:int, title:chararray, genres:chararray);

movies = FILTER movies_raw BY movieId IS NOT NULL;

-- 3. Job 1 & 2 Equivalent: Compute Average Rating and Total Ratings per Movie
grouped_movies = GROUP ratings BY movieId;

movie_stats = FOREACH grouped_movies GENERATE 
    group AS movieId,
    COUNT(ratings) AS total_ratings,
    ROUND_TO(AVG(ratings.rating), 4) AS avg_rating;

-- 4. Join with movie titles
joined_movies = JOIN movie_stats BY movieId, movies BY movieId;

-- Sort by rating count descending
ranked_movies = ORDER joined_movies BY movie_stats::total_ratings DESC;

top_10_movies = LIMIT ranked_movies 10;

-- 5. Store / Display Results
DUMP top_10_movies;
STORE movie_stats INTO 'data/output/pig_movie_stats' USING PigStorage('\t');
