// The Movie Explorer keeps its state in the URL, so a filtered view survives
// reloads, the Back button, and links from other pages. This module is the one
// place that reads and writes those parameters.
//
//   /movies?search=matrix&genres=Action,Sci-Fi&genreMode=and&minRating=4
//           &minCount=50&minYear=1990&maxYear=1999&sortBy=avgRating
//           &sortOrder=asc&page=2&view=grid
//
// Defaults are left out of the URL. `genre=Drama` (singular) is also accepted,
// because other pages link in with it.

export type SortKey = 'weightedRating' | 'ratingCount' | 'avgRating' | 'title' | 'year';
export type SortOrder = 'asc' | 'desc';
export type GenreMode = 'or' | 'and';
export type ViewMode = 'table' | 'grid';

export type ExplorerState = {
  search: string;
  genres: string[];
  /** or: a film needs any selected genre. and: it needs all of them. */
  genreMode: GenreMode;
  minRating: number | null;
  /** Minimum number of ratings. 0 means no minimum. */
  minCount: number;
  minYear: number | null;
  maxYear: number | null;
  sortBy: SortKey;
  sortOrder: SortOrder;
  page: number;
  view: ViewMode;
};

export const PAGE_SIZE = 16;
export const MAX_COMPARE = 4;

/** The Explorer opens on films with at least five ratings, ranked by adjusted score. */
export const DEFAULT_MIN_COUNT = 5;

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'weightedRating', label: 'Adjusted score' },
  { key: 'ratingCount', label: 'Rating count' },
  { key: 'avgRating', label: 'Average rating' },
  { key: 'title', label: 'Title' },
  { key: 'year', label: 'Release year' }
];

/** Titles start A to Z; everything else starts highest first. */
export const defaultOrderFor = (sortBy: SortKey): SortOrder => (sortBy === 'title' ? 'asc' : 'desc');

export const DEFAULT_STATE: ExplorerState = {
  search: '',
  genres: [],
  genreMode: 'or',
  minRating: null,
  minCount: DEFAULT_MIN_COUNT,
  minYear: null,
  maxYear: null,
  sortBy: 'weightedRating',
  sortOrder: 'desc',
  page: 1,
  view: 'table'
};

const numberIn = (raw: string | null, min: number, max: number): number | null => {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
};

const integerIn = (raw: string | null, min: number, max: number): number | null => {
  const value = numberIn(raw, min, max);
  return value === null ? null : Math.trunc(value);
};

/** Read the Explorer's state from the URL. Anything missing or invalid falls back to its default. */
export function parseExplorerParams(params: URLSearchParams): ExplorerState {
  const sortKeys = SORT_OPTIONS.map((option) => option.key);
  const sortParam = params.get('sortBy') as SortKey | null;
  const sortBy = sortParam && sortKeys.includes(sortParam) ? sortParam : DEFAULT_STATE.sortBy;
  const orderParam = params.get('sortOrder');
  const genreList = (params.get('genres') ?? params.get('genre') ?? '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);

  return {
    search: (params.get('search') ?? '').trim(),
    genres: [...new Set(genreList)],
    genreMode: params.get('genreMode') === 'and' ? 'and' : 'or',
    minRating: numberIn(params.get('minRating'), 0, 5),
    minCount: integerIn(params.get('minCount'), 0, 1_000_000) ?? DEFAULT_MIN_COUNT,
    minYear: integerIn(params.get('minYear'), 1800, 2100),
    maxYear: integerIn(params.get('maxYear'), 1800, 2100),
    sortBy,
    sortOrder: orderParam === 'asc' || orderParam === 'desc' ? orderParam : defaultOrderFor(sortBy),
    page: integerIn(params.get('page'), 1, 100_000) ?? 1,
    view: params.get('view') === 'grid' ? 'grid' : 'table'
  };
}

/** Write the state back as URL parameters, leaving out everything that is at its default. */
export function toSearchParams(state: ExplorerState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.genres.length > 0) params.set('genres', state.genres.join(','));
  if (state.genreMode === 'and') params.set('genreMode', 'and');
  if (state.minRating !== null) params.set('minRating', String(state.minRating));
  if (state.minCount !== DEFAULT_MIN_COUNT) params.set('minCount', String(state.minCount));
  if (state.minYear !== null) params.set('minYear', String(state.minYear));
  if (state.maxYear !== null) params.set('maxYear', String(state.maxYear));
  if (state.sortBy !== DEFAULT_STATE.sortBy) params.set('sortBy', state.sortBy);
  if (state.sortOrder !== defaultOrderFor(state.sortBy)) params.set('sortOrder', state.sortOrder);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.view !== DEFAULT_STATE.view) params.set('view', state.view);
  return params;
}

/** The query for GET /api/movies. The API contract is unchanged. */
export function toApiQuery(state: ExplorerState) {
  return {
    page: state.page,
    pageSize: PAGE_SIZE,
    search: state.search || undefined,
    genres: state.genres.length > 0 ? state.genres.join(',') : undefined,
    genreMode: state.genreMode,
    minRating: state.minRating ?? undefined,
    minCount: state.minCount > 0 ? state.minCount : undefined,
    minYear: state.minYear ?? undefined,
    maxYear: state.maxYear ?? undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder
  };
}

export type FilterChip = {
  id: string;
  label: string;
  /** The change that removes this filter, given the state at the moment of the click. */
  clear: (current: ExplorerState) => Partial<ExplorerState>;
};

/** One chip per active filter, each with the change that removes it. */
export function activeFilterChips(state: ExplorerState): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.search) chips.push({ id: 'search', label: `Search: “${state.search}”`, clear: () => ({ search: '' }) });
  state.genres.forEach((genre) => {
    chips.push({
      id: `genre-${genre}`,
      label: `Genre: ${genre}`,
      clear: (current) => ({ genres: current.genres.filter((other) => other !== genre) })
    });
  });
  if (state.genres.length > 1 && state.genreMode === 'and') {
    chips.push({ id: 'genre-mode', label: 'Must match all genres', clear: () => ({ genreMode: 'or' }) });
  }
  if (state.minRating !== null) {
    chips.push({
      id: 'min-rating',
      label: `Average rating: ${state.minRating} or more`,
      clear: () => ({ minRating: null })
    });
  }
  if (state.minCount !== DEFAULT_MIN_COUNT) {
    chips.push({
      id: 'min-count',
      label: state.minCount === 0 ? 'Any number of ratings' : `Ratings: ${state.minCount} or more`,
      clear: () => ({ minCount: DEFAULT_MIN_COUNT })
    });
  }
  if (state.minYear !== null) chips.push({ id: 'min-year', label: `From ${state.minYear}`, clear: () => ({ minYear: null }) });
  if (state.maxYear !== null) chips.push({ id: 'max-year', label: `Up to ${state.maxYear}`, clear: () => ({ maxYear: null }) });
  return chips;
}

/** The Explorer, opened on a title search. Used by links and charts elsewhere in the app. */
export const explorerSearchPath = (search: string): string =>
  `/movies?${toSearchParams({ ...DEFAULT_STATE, search })}`;

/** A link to the Explorer with some filters already set; everything else stays at its default. */
export const explorerPath = (change: Partial<ExplorerState>): string => {
  const query = toSearchParams({ ...DEFAULT_STATE, ...change }).toString();
  return query ? `/movies?${query}` : '/movies';
};
