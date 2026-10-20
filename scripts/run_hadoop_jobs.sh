#!/usr/bin/env bash
# ==============================================================================
# CineMetrics — Hadoop MapReduce Cluster Execution Script
# ==============================================================================
# Executes all 7 MapReduce jobs sequentially on Apache Hadoop YARN.
#
# Developer: Achyuth PV | SRM Ramapuram | Big Data Essentials (21CSC314P)
# ==============================================================================

set -e

JAR_PATH="/opt/cinemetrics/cinemetrics-mapreduce-1.0.0.jar"
if [ ! -f "$JAR_PATH" ]; then
    JAR_PATH="hadoop/target/cinemetrics-mapreduce-1.0.0.jar"
fi

HDFS_INPUT="/cinemetrics/input"
HDFS_OUTPUT="/cinemetrics/output"

echo "======================================================================"
echo "  CineMetrics — Submitting 7 Hadoop MapReduce Jobs to YARN"
echo "======================================================================"

# 1. Ensure HDFS directories exist and upload data
echo "[1/8] Preparing HDFS input directories..."
hdfs dfs -mkdir -p ${HDFS_INPUT}
hdfs dfs -mkdir -p ${HDFS_OUTPUT}

if ! hdfs dfs -test -e ${HDFS_INPUT}/ratings.csv; then
    echo "  → Uploading ratings.csv to HDFS..."
    hdfs dfs -put -f data/raw/ratings.csv ${HDFS_INPUT}/ratings.csv
fi

if ! hdfs dfs -test -e ${HDFS_INPUT}/movies.csv; then
    echo "  → Uploading movies.csv to HDFS..."
    hdfs dfs -put -f data/raw/movies.csv ${HDFS_INPUT}/movies.csv
fi

# Function to run a job and measure time
run_job() {
    local job_name=$1
    local out_dir="${HDFS_OUTPUT}/${job_name}"
    local extra_args=$2

    echo ""
    echo "----------------------------------------------------------------------"
    echo "  Running Job: ${job_name}"
    echo "----------------------------------------------------------------------"
    hdfs dfs -rm -r -f ${out_dir} 2>/dev/null || true

    start_sec=$(date +%s)
    hadoop jar ${JAR_PATH} ${job_name} ${HDFS_INPUT}/ratings.csv ${out_dir} ${extra_args}
    end_sec=$(date +%s)

    duration=$((end_sec - start_sec))
    echo "✓ Job ${job_name} finished in ${duration} seconds."
}

# 2. Run Job 1: Average Rating
run_job "avgrating"

# 3. Run Job 2: Most Rated Movies
run_job "mostrated"

# 4. Run Job 3: Rating Distribution
run_job "ratingdist"

# 5. Run Job 4: Genre Popularity (with DistributedCache for movies.csv)
run_job "genrepop" "-files ${HDFS_INPUT}/movies.csv"

# 6. Run Job 5: Year Ratings (with DistributedCache)
run_job "yearrating" "-files ${HDFS_INPUT}/movies.csv"

# 7. Run Job 6: Hidden Gems (with DistributedCache)
run_job "hiddengems" "-files ${HDFS_INPUT}/movies.csv"

# 8. Run Job 7: Rating Trends Over Time
run_job "ratingtrends"

echo ""
echo "======================================================================"
echo "  All 7 MapReduce Jobs Executed Successfully on YARN!"
echo "======================================================================"
echo "Inspecting HDFS output directories:"
hdfs dfs -ls ${HDFS_OUTPUT}
