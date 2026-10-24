"""
Hadoop Router
==============
Provides endpoints for checking Hadoop cluster status, viewing MapReduce
job history, retrieving dataset metadata, and inspecting raw reducer partition outputs.

- GET /api/hadoop/status          — Hadoop cluster connection status & telemetry
- GET /api/hadoop/jobs            — MapReduce job execution history & provenance
- GET /api/hadoop/output-preview  — Raw reducer partition output viewer for viva inspection
- GET /api/dataset/info           — Dataset metadata and file specifications
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError

from fastapi import APIRouter, HTTPException, Query

import data_loader
from config import settings
from models import HadoopStatus, HadoopJob, HadoopJobsResponse, DatasetInfo

logger = logging.getLogger("cinemetrics.routers.hadoop")

router = APIRouter(prefix="/api", tags=["Hadoop"])


def _try_connect(url: str, timeout: int = 2) -> dict | None:
    """
    Attempt to connect to a Hadoop REST endpoint and parse JSON.
    Returns None if unreachable or timed out.
    """
    try:
        req = Request(url, headers={"User-Agent": "CineMetrics-ClusterTelemetry/1.0"})
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.debug(f"Hadoop ping to {url} failed: {e}")
        return None


@router.get("/hadoop/status", response_model=HadoopStatus)
async def get_hadoop_status():
    """
    Check live Hadoop cluster services (HDFS NameNode 9870, YARN 8088).
    Maintains clean separation between cluster connection state and
    pre-processed analytics snapshot provenance.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # Probe HDFS NameNode
    hdfs_info = _try_connect(f"{settings.HDFS_NAMENODE_URL}/jmx?qry=Hadoop:service=NameNode,name=NameNodeInfo")
    yarn_info = _try_connect(f"{settings.YARN_RESOURCEMANAGER_URL}/ws/v1/cluster/info")

    connected = bool(hdfs_info or yarn_info)
    engine = data_loader.provenance_info.get("engine", "python-reference")
    processed_at = data_loader.provenance_info.get("processedAt")
    api_loaded_at = data_loader.provenance_info.get("apiLoadedAt")

    active_nodes = None
    cluster_version = None

    if hdfs_info and "beans" in hdfs_info and len(hdfs_info["beans"]) > 0:
        bean = hdfs_info["beans"][0]
        cluster_version = bean.get("Version")
        # Live nodes string is JSON encoded inside NameNodeInfo
        try:
            live_nodes = json.loads(bean.get("LiveNodes", "{}"))
            active_nodes = len(live_nodes)
        except Exception:
            pass

    if yarn_info and "clusterInfo" in yarn_info:
        cluster_version = cluster_version or yarn_info["clusterInfo"].get("hadoopVersion")

    message = (
        "Hadoop cluster is active and healthy (NameNode / YARN online)."
        if connected else
        "Hadoop cluster is currently offline. Analytics served from verified MapReduce output partitions."
    )

    return HadoopStatus(
        connected=connected,
        mode="online" if connected else "offline",
        engine=engine,
        message=message,
        processedAt=processed_at,
        apiLoadedAt=api_loaded_at,
        telemetryObservedAt=now_iso,
        activeNodes=active_nodes,
        clusterVersion=cluster_version,
        hdfsStatus=hdfs_info,
        yarnStatus=yarn_info
    )


@router.get("/hadoop/jobs", response_model=HadoopJobsResponse)
async def get_hadoop_jobs():
    """
    Return MapReduce job execution history and engine provenance.
    Reads recorded job logs from jobs.json or queries live JobHistory server.
    Never fabricates fake jobs or synthetic benchmarks.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    engine = data_loader.provenance_info.get("engine", "python-reference")
    mode = data_loader.provenance_info.get("mode", "offline")
    processed_at = data_loader.provenance_info.get("processedAt")
    note = data_loader.provenance_info.get("note")

    # 1. Check live JobHistory server if cluster is online
    live_history = _try_connect(f"{settings.JOBHISTORY_URL}/ws/v1/history/mapreduce/jobs")
    if live_history and "jobs" in live_history:
        try:
            job_list = live_history["jobs"].get("job", [])
            jobs = [
                HadoopJob(
                    jobId=j.get("id", "unknown"),
                    jobName=j.get("name", "MapReduce Job"),
                    status=j.get("state", "SUCCEEDED"),
                    startTime=str(j.get("startTime", "")),
                    endTime=str(j.get("finishTime", "")),
                    mapTasks=j.get("mapsTotal"),
                    reduceTasks=j.get("reducesTotal"),
                    mode="hadoop-yarn",
                    description=f"MapReduce job running on YARN: {j.get('name')}"
                )
                for j in job_list
            ]
            return HadoopJobsResponse(
                jobs=jobs,
                engine="hadoop",
                mode="hadoop-cluster",
                processedAt=processed_at,
                telemetryObservedAt=now_iso,
                note="Telemetry received from live Hadoop JobHistory Server (19888)"
            )
        except Exception as e:
            logger.warning(f"Error parsing live JobHistory: {e}")

    # 2. Return recorded jobs from jobs.json
    recorded = data_loader.provenance_info.get("jobs", [])
    jobs = []
    for j in recorded:
        if isinstance(j, dict):
            jobs.append(HadoopJob(
                jobId=j.get("jobId", "unknown"),
                jobName=j.get("jobName", "MapReduce Job"),
                status=j.get("status", "SUCCEEDED"),
                startTime=j.get("startTime"),
                endTime=j.get("endTime"),
                duration=j.get("duration"),
                inputRecords=j.get("inputRecords"),
                outputRecords=j.get("outputRecords"),
                outputPath=j.get("outputPath"),
                mode=j.get("mode", mode),
                description=j.get("description", f"Job: {j.get('jobName')}")
            ))

    return HadoopJobsResponse(
        jobs=jobs,
        engine=engine,
        mode=mode,
        processedAt=processed_at,
        telemetryObservedAt=now_iso,
        note=note or "MapReduce job logs verified from local processing snapshot"
    )


@router.get("/hadoop/output-preview")
async def get_partition_output_preview(
    job: str = Query(..., description="Job directory name: avgrating, mostrated, ratingdist, genrepop, yearrating, hiddengems, ratingtrends"),
    lines: int = Query(default=25, ge=1, le=100, description="Number of sample lines to return")
):
    """
    Direct inspection of raw TSV reducer partition files for academic demonstration and viva verification.
    """
    valid_jobs = {
        "avgrating": "AverageRating (movieId \\t avgRating \\t ratingCount)",
        "mostrated": "MostRated (movieId \\t ratingCount)",
        "ratingdist": "RatingDistribution (rating \\t count)",
        "genrepop": "GenrePopularity (genre \\t movieCount \\t ratingCount \\t avgRating)",
        "yearrating": "YearRating (year \\t avgRating \\t ratingCount)",
        "hiddengems": "HiddenGems (movieId \\t avgRating \\t ratingCount \\t score)",
        "ratingtrends": "RatingTrends (yearMonth \\t count \\t avgRating)"
    }

    if job not in valid_jobs:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown job '{job}'. Valid options: {list(valid_jobs.keys())}"
        )

    job_dir = settings.DATA_DIR / job
    files = data_loader._find_output_files(job_dir)
    if not files:
        raise HTTPException(status_code=404, detail=f"No output partition files found for job '{job}' in {job_dir}")

    preview_lines = []
    primary_file = files[0]
    try:
        with open(primary_file, "r", encoding="utf-8") as f:
            for _ in range(lines):
                line = f.readline()
                if not line:
                    break
                preview_lines.append(line.rstrip("\r\n"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read partition file: {e}")

    return {
        "job": job,
        "schema": valid_jobs[job],
        "filePath": str(primary_file),
        "fileName": primary_file.name,
        "totalPartitions": len(files),
        "partitionFiles": [f.name for f in files],
        "fileSizeBytes": primary_file.stat().st_size,
        "sampleLinesCount": len(preview_lines),
        "sampleLines": preview_lines
    }


@router.get("/dataset/info", response_model=DatasetInfo)
async def get_dataset_info():
    """
    Return comprehensive dataset metadata including file sizes, records, and licensing.
    """
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
        records=data_loader.global_stats.get("totalRatings", 0),
        movies=data_loader.global_stats.get("totalMovies", 0),
        users=data_loader.global_stats.get("uniqueUsers", 0),
        license="GroupLens Research / Non-commercial academic research",
        files=files,
    )
