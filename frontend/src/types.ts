export interface MovieSummary {
  movieId: number;
  title: string;
  year: number | null;
  genres: string;
  genreList: string[];
  avgRating: number | null;
  ratingCount: number;
  weightedRating: number | null;
  imdbId?: string | null;
  tmdbId?: string | null;
  imdbUrl?: string | null;
  tmdbUrl?: string | null;
}

export interface MovieDetail extends MovieSummary {
  ratingDistribution?: Record<string, number> | null;
  isHiddenGem: boolean;
  hiddenGemScore?: number | null;
  rankMostRated?: number | null;
  globalRankAvg?: number | null;
  bayesianFormula?: {
    v: number;
    m: number;
    R: number;
    C: number;
    WR: number;
    formula: string;
    explanation: string;
  } | null;
}

export interface MovieComparisonResponse {
  movies: MovieDetail[];
  commonGenres: string[];
  globalAverageRating: number;
  analysisSummary: string;
}

export interface PaginatedMovies {
  movies: MovieSummary[];
  items?: MovieSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GenreStats {
  genre: string;
  movieCount: number;
  ratingCount: number;
  avgRating: number;
}

export interface RatingDistribution {
  rating: string;
  count: number;
  percentage?: number;
}

export interface RatingTrend {
  yearMonth: string;
  count: number;
  avgRating: number;
}

export interface YearRating {
  year: string;
  movieCount: number;
  ratingCount: number;
  avgRating: number;
}

export interface HiddenGem {
  movieId: number;
  title: string;
  genres: string;
  year?: number | null;
  avgRating: number;
  ratingCount: number;
  hiddenGemScore: number;
  weightedScore?: number;
  imdbUrl?: string | null;
  tmdbUrl?: string | null;
}

export interface DatasetFile {
  name: string;
  size: string;
  bytes?: number;
}

export interface DatasetInfo {
  name: string;
  version: string;
  source: string;
  license?: string;
  records: number;
  movies?: number;
  users?: number;
  files?: DatasetFile[];
}

export interface OverviewData {
  totalMovies: number;
  totalRatings: number;
  uniqueUsers: number;
  globalAverageRating: number;
  genreCount: number;
  highestRatedMovie: {
    movieId: number;
    title: string;
    genres?: string;
    year?: number | null;
    avgRating?: number;
    ratingCount: number;
  } | null;
  datasetInfo: DatasetInfo;
  engine: string;
  lastProcessed: string;
  apiLoadedAt?: string;
}

export interface HadoopJob {
  jobId: string;
  jobName: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  inputRecords?: number;
  outputRecords?: number;
  inputPath?: string;
  outputPath?: string;
  mapTasks?: number;
  reduceTasks?: number;
  mode?: string;
  description?: string;
}

export interface HadoopJobsResponse {
  jobs: HadoopJob[];
  engine: string;
  mode: string;
  processedAt?: string;
  telemetryObservedAt?: string;
  note?: string;
}

export interface HadoopStatus {
  connected: boolean;
  mode: 'online' | 'offline';
  engine: string;
  message: string;
  processedAt?: string;
  apiLoadedAt?: string;
  telemetryObservedAt?: string;
  activeNodes?: number;
  clusterVersion?: string;
  hdfsStatus?: any;
  yarnStatus?: any;
}

export interface PartitionOutputPreview {
  job: string;
  schema: string;
  filePath: string;
  fileName: string;
  totalPartitions: number;
  partitionFiles: string[];
  fileSizeBytes: number;
  sampleLinesCount: number;
  sampleLines: string[];
}
