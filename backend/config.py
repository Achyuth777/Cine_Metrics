"""
CineMetrics Configuration Module
================================
Centralizes all application settings including file paths, pagination defaults,
and external service URLs. Uses pathlib for cross-platform path handling.
"""

from pathlib import Path


class Settings:
    """
    Application-wide configuration settings.

    All directory paths are resolved relative to this file's location (backend/),
    so the project structure is:
        cinemetrics/
        ├── backend/          <-- this file lives here
        │   ├── config.py
        │   └── ...
        └── data/
            ├── raw/          <-- original CSV files from MovieLens
            ├── processed/    <-- MapReduce output files (TSV format)
            └── output/       <-- any additional output artifacts
    """

    # ──────────────────────────────────────────────
    # Directory paths (relative to backend/)
    # ──────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent          # cinemetrics/
    DATA_DIR: Path = BASE_DIR / "data" / "processed"                 # MapReduce results
    RAW_DATA_DIR: Path = BASE_DIR / "data" / "raw"                   # Original CSVs
    OUTPUT_DIR: Path = BASE_DIR / "data" / "output"                  # Generated outputs
    HADOOP_OUTPUT_DIR: Path = BASE_DIR / "data" / "output"           # Hadoop artifacts

    # ──────────────────────────────────────────────
    # Pagination defaults
    # ──────────────────────────────────────────────
    DEFAULT_PAGE: int = 1
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ──────────────────────────────────────────────
    # External service URLs (Hadoop ecosystem)
    # ──────────────────────────────────────────────
    HDFS_NAMENODE_URL: str = "http://localhost:9870"
    YARN_RESOURCEMANAGER_URL: str = "http://localhost:8088"
    JOBHISTORY_URL: str = "http://localhost:19888"

    # ──────────────────────────────────────────────
    # Dataset metadata
    # ──────────────────────────────────────────────
    DATASET_NAME: str = "MovieLens Latest Small"
    DATASET_VERSION: str = "latest-small"
    DATASET_SOURCE: str = "https://grouplens.org/datasets/movielens/"


# Singleton instance used throughout the application
settings = Settings()
