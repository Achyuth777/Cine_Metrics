"""
Hadoop Router
==============
Provides endpoints for checking Hadoop cluster status, viewing MapReduce
job history, and retrieving dataset metadata.

- GET /api/hadoop/status   — Hadoop cluster connection status
- GET /api/hadoop/jobs     — MapReduce job history
- GET /api/dataset/info    — Dataset metadata and file information

When the Hadoop cluster is not running (typical for local development
or demo mode), these endpoints gracefully return offline/cached data
so the dashboard still works.
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from urllib.request import urlopen, Request
from urllib.error import URLError

from fastapi import APIRouter

import data_loader
from config import settings
from models import HadoopStatus, HadoopJob, DatasetInfo

logger = logging.getLogger("cinemetrics.routers.hadoop")

router = APIRouter(prefix="/api", tags=["Hadoop"])


# ──────────────────────────────────────────────
# Default cached job metadata
# ──────────────────────────────────────────────
DEFAULT_JOBS: List[dict] = [
    {
        "jobId": "job_cinemetrics_001",
        "jobName": "AverageRating",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:00:00Z",
        "endTime": "2026-10-20T20:01:30Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/avgrating",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Computes average rating and count per movie",
    },
    {
        "jobId": "job_cinemetrics_002",
        "jobName": "MostRated",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:02:00Z",
        "endTime": "2026-10-20T20:03:15Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/mostrated",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Finds the most frequently rated movies",
    },
    {
        "jobId": "job_cinemetrics_003",
        "jobName": "RatingDistribution",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:04:00Z",
        "endTime": "2026-10-20T20:05:00Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/ratingdist",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Counts ratings at each rating level (0.5–5.0)",
    },
    {
        "jobId": "job_cinemetrics_004",
        "jobName": "GenrePopularity",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:06:00Z",
        "endTime": "2026-10-20T20:07:30Z",
        "inputPath": "/cinemetrics/input/ratings.csv,/cinemetrics/input/movies.csv",
        "outputPath": "/cinemetrics/output/genrepop",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Aggregates rating statistics per genre",
    },
    {
        "jobId": "job_cinemetrics_005",
        "jobName": "YearRating",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:08:00Z",
        "endTime": "2026-10-20T20:09:15Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/yearrating",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Computes average rating by release year",
    },
    {
        "jobId": "job_cinemetrics_006",
        "jobName": "HiddenGems",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:10:00Z",
        "endTime": "2026-10-20T20:11:30Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/hiddengems",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Identifies highly-rated but under-watched movies",
    },
    {
        "jobId": "job_cinemetrics_007",
        "jobName": "RatingTrends",
        "status": "SUCCEEDED",
        "startTime": "2026-10-20T20:12:00Z",
        "endTime": "2026-10-20T20:13:30Z",
        "inputPath": "/cinemetrics/input/ratings.csv",
        "outputPath": "/cinemetrics/output/ratingtrends",
        "mapTasks": 2,
        "reduceTasks": 1,
        "description": "Aggregates rating activity by month",
    },
]


def _try_connect(url: str, timeout: int = 3) -> dict | None:
    """
    Attempt to connect to a URL and parse JSON response.

    Used to probe Hadoop REST APIs (HDFS NameNode, YARN ResourceManager).
    Returns None if the service is unreachable.

    Args:
        url: Full URL to the REST API endpoint.
        timeout: Connection timeout in seconds.

    Returns:
        Parsed JSON dict, or None on failure.
    """
    try:
        req = Request(url)
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (URLError, OSError, json.JSONDecodeError, Exception) as e:
        logger.debug(f"Could not connect to {url}: {e}")
        return None


@router.get("/hadoop/status", response_model=HadoopStatus)
async def get_hadoop_status():
    """
    Check the Hadoop cluster connection status.

    Attempts to connect to:
    1. HDFS NameNode REST API (default: http://localhost:9870)
    2. YARN ResourceManager REST API (default: http://localhost:8088)

    If either is reachable, reports as online with cluster details.
    If both are unreachable, reports as offline — the dashboard will
    still function using cached/pre-processed analytics data.

    Returns:
        HadoopStatus with connection state and any available cluster info.
    """
    # Try HDFS NameNode
    hdfs_info = _try_connect(f"{settings.HDFS_NAMENODE_URL}/jmx?qry=Hadoop:service=NameNode,name=NameNodeInfo")
    yarn_info = _try_connect(f"{settings.YARN_RESOURCEMANAGER_URL}/ws/v1/cluster/info")

    if hdfs_info or yarn_info:
        return HadoopStatus(
            connected=True,
            mode="online",
            message="Hadoop cluster is running and connected.",
            hdfsStatus=hdfs_info,
            yarnStatus=yarn_info,
        )
    else:
        return HadoopStatus(
            connected=False,
            mode="offline",
            message=(
                "Hadoop cluster not available. "
                "Displaying cached analytics results from pre-processed MapReduce output."
            ),
            hdfsStatus=None,
            yarnStatus=None,
        )


@router.get("/hadoop/jobs", response_model=List[HadoopJob])
async def get_hadoop_jobs():
    """
    Return MapReduce job history.

    First attempts to query the Hadoop Job History Server for real
    job data. If the server is unreachable, falls back to:
    1. A cached jobs.json file in data/processed/
    2. Hard-coded default job metadata

    This ensures the dashboard always shows meaningful job information
    regardless of cluster availability.

    Returns:
        List of HadoopJob objects with job metadata.
    """
    # Try live job history server first
    live_jobs = _try_connect(f"{settings.JOBHISTORY_URL}/ws/v1/history/mapreduce/jobs")
    if live_jobs and "jobs" in live_jobs:
        try:
            job_list = live_jobs["jobs"].get("job", [])
            return [
                HadoopJob(
                    jobId=j.get("id", "unknown"),
                    jobName=j.get("name", "Unknown Job"),
                    status=j.get("state", "UNKNOWN"),
                    startTime=str(j.get("startTime", "")),
                    endTime=str(j.get("finishTime", "")),
                    mapTasks=j.get("mapsTotal"),
                    reduceTasks=j.get("reducesTotal"),
                )
                for j in job_list
            ]
        except Exception as e:
            logger.warning(f"Error parsing live job data: {e}")

    # Try cached jobs.json
    jobs_file = settings.DATA_DIR / "jobs.json"
    if jobs_file.exists():
        try:
            with open(jobs_file, "r", encoding="utf-8") as f:
                cached = json.load(f)
            job_items = cached.get("jobs", cached) if isinstance(cached, dict) else cached
            if isinstance(job_items, list):
                result_jobs = []
                for j in job_items:
                    if isinstance(j, dict):
                        result_jobs.append(HadoopJob(
                            jobId=j.get("jobId", "unknown"),
                            jobName=j.get("jobName", "Unknown Job"),
                            status=j.get("status", "SUCCEEDED"),
                            startTime=j.get("startTime"),
                            endTime=j.get("endTime"),
                            outputPath=j.get("outputPath"),
                            description=j.get("description", j.get("mode"))
                        ))
                if result_jobs:
                    return result_jobs
        except Exception as e:
            logger.warning(f"Error reading cached jobs.json: {e}")

    # Fall back to defaults
    return [HadoopJob(**j) for j in DEFAULT_JOBS]


@router.get("/dataset/info", response_model=DatasetInfo)
async def get_dataset_info():
    """
    Return metadata about the MovieLens dataset being analyzed.

    Includes:
    - Dataset name and version
    - Source URL (GroupLens website)
    - Total number of rating records
    - List of raw data files with their sizes

    Returns:
        DatasetInfo with full dataset metadata.
    """
    # Gather file info from the raw data directory
    files = []
    raw_dir = settings.RAW_DATA_DIR
    if raw_dir.exists():
        for f in sorted(raw_dir.iterdir()):
            if f.is_file():
                size_bytes = f.stat().st_size
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                files.append({"name": f.name, "size": size_str, "bytes": size_bytes})

    return DatasetInfo(
        name=settings.DATASET_NAME,
        version=settings.DATASET_VERSION,
        source=settings.DATASET_SOURCE,
        records=data_loader.global_stats["totalRatings"],
        files=files,
    )
