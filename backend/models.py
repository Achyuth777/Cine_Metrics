"""
CineMetrics Pydantic Models
============================
Defines all request/response schemas used by the API endpoints.
Pydantic v2 models provide automatic validation, serialization, and
OpenAPI documentation generation.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ╔══════════════════════════════════════════════════════════════╗
# ║  Movie Models                                                ║
# ╚══════════════════════════════════════════════════════════════╝

class MovieSummary(BaseModel):
    """Compact movie representation for list views and ranking tables."""
    movieId: int = Field(..., description="Unique movie identifier from MovieLens")
    title: str = Field(..., description="Movie title including release year")
    genres: str = Field(..., description="Pipe-separated genre list, e.g. 'Action|Comedy'")
    year: Optional[int] = Field(None, description="Extracted release year, or None if unknown")
    genreList: List[str] = Field(default_factory=list, description="List of individual genres")
    avgRating: Optional[float] = Field(None, description="Average user rating (0.5–5.0)")
    ratingCount: Optional[int] = Field(None, description="Number of ratings received")
    weightedRating: Optional[float] = Field(None, description="Bayesian weighted rating for fair ranking")
    imdbId: Optional[str] = Field(None, description="IMDb identifier from links.csv")
    tmdbId: Optional[str] = Field(None, description="TMDb identifier from links.csv")
    imdbUrl: Optional[str] = Field(None, description="External URL to IMDb title page")
    tmdbUrl: Optional[str] = Field(None, description="External URL to TMDb title page")


class MovieDetail(BaseModel):
    """Full movie record with all analytics, distribution, and Bayesian breakdown."""
    movieId: int
    title: str
    genres: str
    year: Optional[int] = None
    genreList: List[str] = Field(default_factory=list, description="Genres split into a list")
    avgRating: Optional[float] = None
    ratingCount: Optional[int] = None
    weightedRating: Optional[float] = None
    imdbId: Optional[str] = None
    tmdbId: Optional[str] = None
    imdbUrl: Optional[str] = None
    tmdbUrl: Optional[str] = None
    ratingDistribution: Optional[Dict[str, int]] = Field(None, description="Per-movie histogram: counts for 0.5 to 5.0 stars")
    isHiddenGem: bool = Field(False, description="Whether this movie qualifies as a hidden gem")
    hiddenGemScore: Optional[float] = None
    rankMostRated: Optional[int] = Field(None, description="Rank among all movies by rating volume")
    globalRankAvg: Optional[int] = Field(None, description="Rank among movies with >= 10 ratings by average score")
    bayesianFormula: Optional[Dict[str, Any]] = Field(
        None,
        description="Detailed variables for Viva: v (votes), m (threshold=10), R (movie avg), C (global avg)"
    )


class MovieComparisonItem(BaseModel):
    """Side-by-side comparison payload for a single movie."""
    movie: MovieDetail
    divergenceFromGlobalAvg: float = Field(..., description="avgRating - globalAverageRating")
    percentageHighRatings: float = Field(..., description="Percentage of 4.0-5.0 star ratings")


class MovieComparisonResponse(BaseModel):
    """Response payload for multi-movie comparison (2 to 4 movies)."""
    movies: List[MovieDetail]
    commonGenres: List[str]
    globalAverageRating: float
    analysisSummary: str


# ╔══════════════════════════════════════════════════════════════╗
# ║  Genre Models                                                ║
# ╚══════════════════════════════════════════════════════════════╝

class GenreStats(BaseModel):
    """Aggregated statistics for a single genre."""
    genre: str = Field(..., description="Genre name, e.g. 'Drama'")
    movieCount: int = Field(..., description="Number of movies tagged with this genre")
    ratingCount: int = Field(0, description="Total number of ratings across all movies in genre")
    avgRating: float = Field(0.0, description="Mean rating across all movies in genre")


# ╔══════════════════════════════════════════════════════════════╗
# ║  Rating Models                                               ║
# ╚══════════════════════════════════════════════════════════════╝

class RatingDistribution(BaseModel):
    """One bucket in the global rating histogram (e.g. rating=4.0, count=26818)."""
    rating: str = Field(..., description="Rating value as string, e.g. '4.0'")
    count: int = Field(..., description="Number of ratings with this value")
    percentage: Optional[float] = Field(None, description="Share of total ratings")


class RatingTrend(BaseModel):
    """Monthly aggregation of rating activity."""
    yearMonth: str = Field(..., description="Month in YYYY-MM format")
    count: int = Field(..., description="Number of ratings submitted that month")
    avgRating: float = Field(..., description="Average rating for that month")


class YearRating(BaseModel):
    """Average rating and rating volume by movie release year."""
    year: str = Field(..., description="Release year as string, or 'Unknown'")
    ratingCount: int = Field(..., description="Total ratings for movies released in this year")
    avgRating: float = Field(..., description="Average rating for movies released in this year")
    movieCount: int = Field(0, description="Unique movies released in this year")


# ╔══════════════════════════════════════════════════════════════╗
# ║  Hidden Gems Model                                          ║
# ╚══════════════════════════════════════════════════════════════╝

class HiddenGem(BaseModel):
    """A highly-rated but under-appreciated movie."""
    movieId: int
    title: str
    genres: str
    year: Optional[int] = None
    avgRating: float = Field(..., description="Average rating (typically ≥ 4.0)")
    ratingCount: int = Field(..., description="Number of ratings (typically low)")
    hiddenGemScore: float = Field(..., description="Composite score: high rating + low popularity")
    weightedScore: Optional[float] = Field(None, description="Bayesian weighted score alias")
    imdbUrl: Optional[str] = None
    tmdbUrl: Optional[str] = None


# ╔══════════════════════════════════════════════════════════════╗
# ║  Hadoop / Infrastructure Models                              ║
# ╚══════════════════════════════════════════════════════════════╝

class HadoopStatus(BaseModel):
    """Current state of the Hadoop cluster connection and telemetry."""
    connected: bool = Field(..., description="Whether the Hadoop cluster is reachable")
    mode: str = Field(..., description="'online' or 'offline'")
    engine: str = Field("python-reference", description="Processing engine provenance: 'hadoop' | 'python-reference' | 'sample'")
    message: str = Field(..., description="Human-readable status message")
    processedAt: Optional[str] = Field(None, description="Timestamp when MapReduce dataset was generated")
    apiLoadedAt: Optional[str] = Field(None, description="Timestamp when API loaded processed partitions")
    telemetryObservedAt: Optional[str] = Field(None, description="Timestamp when cluster was probed")
    activeNodes: Optional[int] = Field(None, description="Active DataNode / NodeManager count")
    clusterVersion: Optional[str] = Field(None, description="Hadoop version if cluster is online")
    hdfsStatus: Optional[dict] = Field(None, description="HDFS namenode info if online")
    yarnStatus: Optional[dict] = Field(None, description="YARN ResourceManager info if online")


class HadoopJob(BaseModel):
    """Metadata for a completed MapReduce job."""
    jobId: str = Field(..., description="Unique job identifier")
    jobName: str = Field(..., description="Descriptive job name, e.g. 'AverageMovieRating'")
    status: str = Field("SUCCEEDED", description="Job completion status")
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    duration: Optional[str] = None
    inputRecords: Optional[int] = None
    outputRecords: Optional[int] = None
    inputPath: Optional[str] = None
    outputPath: Optional[str] = None
    mapTasks: Optional[int] = None
    reduceTasks: Optional[int] = None
    mode: Optional[str] = None
    description: Optional[str] = None


class HadoopJobsResponse(BaseModel):
    """Container response for Hadoop jobs with engine provenance and timestamps."""
    jobs: List[HadoopJob] = Field(default_factory=list)
    engine: str = Field("python-reference", description="'hadoop' | 'python-reference' | 'sample'")
    mode: str = Field("offline", description="'hadoop-cluster' | 'local-simulation' | 'offline'")
    processedAt: Optional[str] = None
    telemetryObservedAt: Optional[str] = None
    note: Optional[str] = None


class DatasetInfo(BaseModel):
    """Metadata about the MovieLens dataset being analyzed."""
    name: str
    version: str
    source: str
    records: int = Field(..., description="Total number of rating records")
    movies: Optional[int] = None
    users: Optional[int] = None
    license: Optional[str] = Field("GroupLens Research / Non-commercial academic", description="Dataset license")
    files: Optional[List[dict]] = Field(None, description="List of dataset files with sizes")


# ╔══════════════════════════════════════════════════════════════╗
# ║  Composite Response Models                                   ║
# ╚══════════════════════════════════════════════════════════════╝

class HighestRatedMovie(BaseModel):
    """The top-rated movie in the dataset (with minimum rating threshold)."""
    movieId: int
    title: str
    avgRating: float
    ratingCount: int
    genres: Optional[str] = None
    year: Optional[int] = None


class OverviewResponse(BaseModel):
    """Dashboard overview with global statistics."""
    totalMovies: int
    totalRatings: int
    uniqueUsers: int
    globalAverageRating: float
    genreCount: int
    highestRatedMovie: Optional[HighestRatedMovie] = None
    datasetInfo: DatasetInfo
    engine: str = Field("python-reference", description="Processing engine provenance")
    lastProcessed: str = Field(..., description="ISO-8601 timestamp of last data processing run")
    apiLoadedAt: Optional[str] = Field(None, description="ISO-8601 timestamp when API loaded caches")


class PaginatedMovies(BaseModel):
    """Paginated response wrapper for movie list endpoints."""
    movies: List[MovieSummary]
    items: Optional[List[MovieSummary]] = None  # Alias for backward compatibility
    total: int = Field(..., description="Total movies matching the filters")
    page: int = Field(..., description="Current page number (1-indexed)")
    pageSize: int = Field(..., description="Items per page")
    totalPages: int = Field(..., description="Total number of pages")
