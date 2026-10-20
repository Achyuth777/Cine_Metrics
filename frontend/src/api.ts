import {
  OverviewData,
  PaginatedMovies,
  MovieSummary,
  GenreStats,
  RatingDistribution,
  RatingTrend,
  YearRating,
  HiddenGem,
  HadoopJob,
  HadoopStatus,
  DatasetInfo
} from './types';

const API_BASE = '';

async function request<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
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
    }
  });

  if (!res.ok) {
    throw new Error(`API Request Failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  getOverview: (): Promise<OverviewData> => request<OverviewData>('/api/overview'),

  getMovies: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    genre?: string;
    minRating?: number;
    maxRating?: number;
    minCount?: number;
    sortBy?: 'avgRating' | 'weightedRating' | 'ratingCount' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedMovies> => request<PaginatedMovies>('/api/movies', params),

  getMovie: (movieId: number): Promise<MovieSummary> => request<MovieSummary>(`/api/movies/${movieId}`),

  getGenres: (): Promise<GenreStats[]> => request<GenreStats[]>('/api/genres'),

  getRatingDistribution: (): Promise<RatingDistribution[]> => request<RatingDistribution[]>('/api/ratings/distribution'),

  getRatingTrends: (): Promise<RatingTrend[]> => request<RatingTrend[]>('/api/ratings/trends'),

  getYearRatings: (): Promise<YearRating[]> => request<YearRating[]>('/api/ratings/years'),

  getHiddenGems: (params?: {
    limit?: number;
    minRating?: number;
    maxCount?: number;
  }): Promise<HiddenGem[]> => request<HiddenGem[]>('/api/analytics/hidden-gems', params),

  getHadoopStatus: (): Promise<HadoopStatus> => request<HadoopStatus>('/api/hadoop/status'),

  getHadoopJobs: (): Promise<{ jobs: HadoopJob[]; mode: string; note: string }> =>
    request<{ jobs: HadoopJob[]; mode: string; note: string }>('/api/hadoop/jobs'),

  getDatasetInfo: (): Promise<DatasetInfo> => request<DatasetInfo>('/api/dataset/info')
};
