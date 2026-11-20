import {
  OverviewData,
  PaginatedMovies,
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

import { apiStatus } from './apiStatus';

const API_BASE = '';

/** A failed API request. `status` is missing when no response arrived at all. */
export class ApiError extends Error {
  status?: number;
  /** The `detail` text FastAPI sends with an error, when there is one. */
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/** True when the failure means the API could not be reached, as opposed to a rejected request. */
export function isUnreachable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === undefined || [502, 503, 504].includes(error.status));
}

const readDetail = (body: string): string | undefined => {
  try {
    const detail = JSON.parse(body)?.detail;
    return typeof detail === 'string' ? detail : undefined;
  } catch {
    return undefined;
  }
};

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

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      },
      signal
    });
  } catch (error) {
    // A cancelled request says nothing about the API.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    apiStatus.report({ state: 'unreachable', at: Date.now(), detail: 'No response' });
    throw new ApiError('API unreachable: no response');
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const label = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
    if ([502, 503, 504].includes(res.status)) {
      apiStatus.report({ state: 'unreachable', at: Date.now(), detail: label });
    } else if (res.status >= 500) {
      apiStatus.report({ state: 'error', at: Date.now(), detail: label });
    } else {
      // The API answered; it just rejected this request.
      apiStatus.report({ state: 'connected', at: Date.now() });
    }
    throw new ApiError(
      `API ${res.status}: ${res.statusText || errorBody || 'Request failed'}`,
      res.status,
      readDetail(errorBody)
    );
  }

  let data: T;
  try {
    data = await res.json();
  } catch {
    // A 200 that is not JSON (for example a static host's fallback page) is not a working API.
    apiStatus.report({ state: 'unreachable', at: Date.now(), detail: 'Response was not JSON' });
    throw new ApiError('API unreachable: the response was not JSON');
  }

  apiStatus.report({ state: 'connected', at: Date.now() });
  return data;
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
