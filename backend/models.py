"""
CineMetrics Pydantic Models
============================
Defines all request/response schemas used by the API endpoints.
Pydantic v2 models provide automatic validation, serialization, and
OpenAPI documentation generation.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ╔══════════════════════════════════════════════════════════════╗
# ║  Movie Models                                                ║
# ╚══════════════════════════════════════════════════════════════╝

class MovieSummary(BaseModel):
    """Compact movie representation for list views."""
    movieId: int = Field(..., description="Unique movie identifier from MovieLens")
    title: str = Field(..., description="Movie title including release year")
    genres: str = Field(..., description="Pipe-separated genre list, e.g. 'Action|Comedy'")
    year: Optional[int] = Field(None, description="Extracted release year")
    genreList: List[str] = Field(default_factory=list, description="List of individual genres")
    avgRating: Optional[float] = Field(None, description="Average user rating (1.0–5.0)")
    ratingCount: Optional[int] = Field(None, description="Number of ratings received")
    weightedRating: Optional[float] = Field(None, description="Bayesian weighted rating for fair ranking")


class MovieDetail(BaseModel):
    """Full movie record with all analytics data attached."""
    movieId: int
    title: str
    genres: str
    avgRating: Optional[float] = None
    ratingCount: Optional[int] = None
    weightedRating: Optional[float] = None
    genreList: List[str] = Field(default_factory=list, description="Genres split into a list")
    ratingDistribution: Optional[dict] = Field(None, description="Histogram of ratings for this movie")
    isHiddenGem: bool = Field(False, description="Whether this movie qualifies as a hidden gem")
    hiddenGemScore: Optional[float] = None


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
    avgRating: float = Field(..., description="Average rating (typically ≥ 4.0)")
    ratingCount: int = Field(..., description="Number of ratings (typically low)")
    hiddenGemScore: float = Field(..., description="Composite score: high rating + low popularity")
    weightedScore: Optional[float] = Field(None, description="Bayesian weighted score alias")


# ╔══════════════════════════════════════════════════════════════╗
# ║  Hadoop / Infrastructure Models                              ║
# ╚══════════════════════════════════════════════════════════════╝

class HadoopStatus(BaseModel):
    """Current state of the Hadoop cluster connection."""
    connected: bool = Field(..., description="Whether the Hadoop cluster is reachable")
    mode: str = Field(..., description="'online' or 'offline'")
    message: str = Field(..., description="Human-readable status message")
    hdfsStatus: Optional[dict] = Field(None, description="HDFS namenode info if online")
    yarnStatus: Optional[dict] = Field(None, description="YARN ResourceManager info if online")


class HadoopJob(BaseModel):
    """Metadata for a completed MapReduce job."""
    jobId: str = Field(..., description="Unique job identifier")
    jobName: str = Field(..., description="Descriptive job name, e.g. 'AverageRatingJob'")
    status: str = Field("SUCCEEDED", description="Job completion status")
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    inputPath: Optional[str] = None
    outputPath: Optional[str] = None
    mapTasks: Optional[int] = None
    reduceTasks: Optional[int] = None
    description: Optional[str] = None


class DatasetInfo(BaseModel):
    """Metadata about the MovieLens dataset being analyzed."""
    name: str
    version: str
    source: str
    records: int = Field(..., description="Total number of rating records")
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


class OverviewResponse(BaseModel):
    """Dashboard overview with global statistics."""
    totalMovies: int
    totalRatings: int
    uniqueUsers: int
    globalAverageRating: float
    genreCount: int
    highestRatedMovie: Optional[HighestRatedMovie] = None
    datasetInfo: DatasetInfo
    lastProcessed: str = Field(..., description="ISO-8601 timestamp of last data processing run")


class PaginatedMovies(BaseModel):
    """Paginated response wrapper for movie list endpoints."""
    movies: List[MovieSummary]
    total: int = Field(..., description="Total movies matching the filters")
    page: int = Field(..., description="Current page number (1-indexed)")
    pageSize: int = Field(..., description="Items per page")
    totalPages: int = Field(..., description="Total number of pages")
