export interface MovieSummary {
  movieId: number;
  title: string;
  year: number | null;
  genres: string;
  genreList: string[];
  avgRating: number;
  ratingCount: number;
  weightedRating: number;
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
}

export interface RatingTrend {
  yearMonth: string;
  ratingCount: number;
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
  avgRating: number;
  ratingCount: number;
  weightedScore: number;
}

export interface DatasetInfo {
  name: string;
  version: string;
  source: string;
  license: string;
  records: number;
  movies: number;
  users: number;
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
    averageRating?: number;
    avgRating?: number;
    ratingCount: number;
  } | null;
  datasetInfo: DatasetInfo;
  lastProcessed: string;
}

export interface HadoopJob {
  jobName: string;
  jobId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'RUNNING' | 'PENDING';
  startTime: string;
  endTime: string;
  duration: string;
  inputRecords: number;
  outputRecords: number;
  outputPath: string;
  mode: string;
}

export interface HadoopStatus {
  connected: boolean;
  mode: 'live' | 'offline' | 'local-simulation';
  clusterVersion?: string;
  activeNodes?: number;
  nameNodeStatus?: string;
  yarnStatus?: string;
  message?: string;
  hdfsUsedBytes?: number;
  hdfsCapacityBytes?: number;
}
