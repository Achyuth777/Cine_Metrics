import {
  OverviewData,
  PaginatedMovies,
  MovieSummary,
  MovieDetail,
  MovieComparisonResponse,
  GenreStats,
  RatingDistribution,
  RatingTrend,
  YearRating,
  HiddenGem,
  HadoopJobsResponse,
  HadoopStatus,
  DatasetInfo,
  PartitionOutputPreview
} from './types';

const API_BASE = '';

async function request<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json'
    },
    signal
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${res.statusText || errorBody || 'Request failed'}`);
  }

  return res.json();
}

export const api = {
  getOverview: (): Promise<OverviewData> =>
    request<OverviewData>('/api/overview'),

  getMovies: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    genre?: string;
    genres?: string;
    genreMode?: 'and' | 'or';
    minRating?: number;
    maxRating?: number;
    minCount?: number;
    minYear?: number;
    maxYear?: number;
    sortBy?: 'avgRating' | 'weightedRating' | 'ratingCount' | 'title' | 'year';
    sortOrder?: 'asc' | 'desc';
  }, signal?: AbortSignal): Promise<PaginatedMovies> =>
    request<PaginatedMovies>('/api/movies', params, signal),

  getMovie: (movieId: number): Promise<MovieDetail> =>
    request<MovieDetail>(`/api/movies/${movieId}`),

  compareMovies: (ids: number[]): Promise<MovieComparisonResponse> =>
    request<MovieComparisonResponse>('/api/movies/compare', { ids: ids.join(',') }),

  getGenres: (): Promise<GenreStats[]> =>
    request<GenreStats[]>('/api/genres'),

  getRatingDistribution: (): Promise<RatingDistribution[]> =>
    request<RatingDistribution[]>('/api/ratings/distribution'),

  getRatingTrends: (): Promise<RatingTrend[]> =>
    request<RatingTrend[]>('/api/ratings/trends'),

  getYearRatings: (): Promise<YearRating[]> =>
    request<YearRating[]>('/api/ratings/years'),

  getHiddenGems: (params?: {
    limit?: number;
    minRating?: number;
    minCount?: number;
    maxCount?: number;
  }): Promise<HiddenGem[]> =>
    request<HiddenGem[]>('/api/analytics/hidden-gems', params),

  getHadoopStatus: (): Promise<HadoopStatus> =>
    request<HadoopStatus>('/api/hadoop/status'),

  getHadoopJobs: (): Promise<HadoopJobsResponse> =>
    request<HadoopJobsResponse>('/api/hadoop/jobs'),

  getPartitionOutputPreview: (job: string, lines: number = 25): Promise<PartitionOutputPreview> =>
    request<PartitionOutputPreview>('/api/hadoop/output-preview', { job, lines }),

  getDatasetInfo: (): Promise<DatasetInfo> =>
    request<DatasetInfo>('/api/dataset/info')
};
