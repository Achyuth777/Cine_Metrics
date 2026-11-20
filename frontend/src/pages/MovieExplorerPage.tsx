import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { api } from '../api';
import { EmptyState, ErrorState, LoadingSpinner } from '../components/LoadingState';
import GenrePicker from '../components/movies/GenrePicker';
import MovieCompareDialog from '../components/movies/MovieCompareDialog';
import MovieDetailDrawer from '../components/movies/MovieDetailDrawer';
import FilmPoster from '../components/poster/FilmPoster';
import { usePosterTilt } from '../components/poster/usePosterTilt';
import { buttonClass } from '../components/system/buttonClass';
import Metric from '../components/system/Metric';
import PageHeader from '../components/system/PageHeader';
import { useQuery } from '../hooks/useQuery';
import {
  DEFAULT_STATE,
  MAX_COMPARE,
  PAGE_SIZE,
  SORT_OPTIONS,
  activeFilterChips,
  defaultOrderFor,
  parseExplorerParams,
  toApiQuery,
  toSearchParams,
  type ExplorerState,
  type SortKey
} from '../lib/explorerParams';
import { describeError, formatCount, formatScore, titleWithoutYear } from '../lib/format';
import { TMDB_ENABLED, TMDB_NOTICE } from '../lib/tmdb';
import type { MovieSummary } from '../types';

const FIELD =
  'h-10 w-full rounded-control border border-line-strong bg-canvas px-3 text-sm text-ink tabular-nums placeholder:text-ink-2 transition-colors duration-150 hover:border-ink-2';
const FIELD_LABEL = 'mb-1.5 block text-[13px] font-medium text-ink-2';
const COMPARE_FULL = `The compare list is full (${MAX_COMPARE} films). Remove one to add another.`;

/** The text fields hold drafts. They apply together when the form is submitted, as before the redesign. */
type Draft = { search: string; minRating: string; minCount: string; minYear: string; maxYear: string };

const draftFrom = (state: ExplorerState): Draft => ({
  search: state.search,
  minRating: state.minRating === null ? '' : String(state.minRating),
  minCount: state.minCount === 0 ? '' : String(state.minCount),
  minYear: state.minYear === null ? '' : String(state.minYear),
  maxYear: state.maxYear === null ? '' : String(state.maxYear)
});

const toNumber = (raw: string): number | null => {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

/** The Explorer's state as the address bar holds it right now. */
const readUrl = (): ExplorerState => parseExplorerParams(new URLSearchParams(window.location.search));

type Selection = { id: number; title: string };

type ResultsProps = {
  films: MovieSummary[];
  selectedIds: number[];
  onToggleCompare: (film: MovieSummary) => void;
  onOpenDetail: (id: number) => void;
};

function CompareCheckbox({
  film,
  checked,
  full,
  onToggle,
  withLabel = false
}: {
  film: MovieSummary;
  checked: boolean;
  full: boolean;
  onToggle: (film: MovieSummary) => void;
  withLabel?: boolean;
}) {
  const blocked = full && !checked;
  const box = (
    <input
      type="checkbox"
      checked={checked}
      disabled={blocked}
      onChange={() => onToggle(film)}
      aria-label={withLabel ? undefined : `Compare ${titleWithoutYear(film.title)}`}
      title={blocked ? COMPARE_FULL : undefined}
      className="cm-check"
    />
  );
  if (!withLabel) return box;
  return (
    <label
      className={clsx('flex shrink-0 items-center gap-2 text-[13px] text-ink-2', blocked ? 'cursor-not-allowed' : 'cursor-pointer')}
      title={blocked ? COMPARE_FULL : undefined}
    >
      {box}
      Compare
      <span className="sr-only"> {titleWithoutYear(film.title)}</span>
    </label>
  );
}

function ExternalLinks({ film }: { film: MovieSummary }) {
  if (!film.imdbUrl && !film.tmdbUrl) return <span className="text-ink-2">—</span>;
  const link = 'rounded-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink';
  return (
    <span className="flex gap-3 text-[13px]">
      {film.imdbUrl && (
        <a href={film.imdbUrl} target="_blank" rel="noopener noreferrer" className={link}>
          IMDb<span className="sr-only"> page for {titleWithoutYear(film.title)} (opens in a new tab)</span>
        </a>
      )}
      {film.tmdbUrl && (
        <a href={film.tmdbUrl} target="_blank" rel="noopener noreferrer" className={link}>
          TMDb<span className="sr-only"> page for {titleWithoutYear(film.title)} (opens in a new tab)</span>
        </a>
      )}
    </span>
  );
}

/** Table view: one row per film, built for comparing the three numbers down a column. */
function ResultsTable({ films, selectedIds, onToggleCompare, onOpenDetail, sort }: ResultsProps & { sort: ExplorerState }) {
  const full = selectedIds.length >= MAX_COMPARE;
  const sortFor = (key: SortKey) =>
    sort.sortBy === key ? (sort.sortOrder === 'asc' ? ('ascending' as const) : ('descending' as const)) : undefined;

  return (
    <div
      className="relative overflow-x-auto rounded-panel bg-surface-1"
      role="region"
      aria-label="Films, scrollable table"
      tabIndex={0}
    >
      <table className="w-full min-w-[780px] text-left text-sm sm:min-w-[880px]">
        <thead className="border-b border-line text-[13px] text-ink-2">
          <tr>
            <th scope="col" className="w-11 py-3 pl-4 pr-1 font-medium">
              <span className="sr-only">Compare</span>
            </th>
            <th scope="col" aria-sort={sortFor('title')} className="px-3 py-3 font-medium">
              Film
            </th>
            <th scope="col" aria-sort={sortFor('year')} className="px-3 py-3 font-medium">
              Year
            </th>
            <th scope="col" aria-sort={sortFor('avgRating')} className="px-3 py-3 text-right font-medium">
              Average rating
            </th>
            <th scope="col" aria-sort={sortFor('ratingCount')} className="px-3 py-3 text-right font-medium">
              Rating count
            </th>
            <th scope="col" aria-sort={sortFor('weightedRating')} className="px-3 py-3 text-right font-medium">
              Adjusted score <span className="font-normal">(Bayesian)</span>
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Links
            </th>
            <th scope="col" className="py-3 pl-3 pr-4 font-medium">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {films.map((film) => {
            const selected = selectedIds.includes(film.movieId);
            return (
              <tr
                key={film.movieId}
                className={clsx('transition-colors duration-150', selected ? 'bg-accent/[0.08]' : 'hover:bg-surface-2/60')}
              >
                <td className={clsx('py-3 pl-4 pr-1', selected && 'shadow-[inset_3px_0_0_var(--cm-accent)]')}>
                  <CompareCheckbox film={film} checked={selected} full={full} onToggle={onToggleCompare} />
                </td>
                <th scope="row" className="max-w-[13rem] px-3 py-3 font-normal sm:max-w-[22rem]">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(film.movieId)}
                    className="rounded-sm text-left text-[15px] font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
                  >
                    {titleWithoutYear(film.title)}
                  </button>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-2">
                    {film.genreList.length > 0 ? film.genreList.join(', ') : 'No genres listed'}
                  </span>
                </th>
                <td className="px-3 py-3 text-ink-2 tabular-nums">{film.year ?? '—'}</td>
                <td className="px-3 py-3 text-right text-ink tabular-nums">{formatScore(film.avgRating)}</td>
                <td className="px-3 py-3 text-right text-ink tabular-nums">{formatCount(film.ratingCount)}</td>
                <td className="px-3 py-3 text-right font-semibold text-accent tabular-nums">
                  {formatScore(film.weightedRating)}
                </td>
                <td className="px-3 py-3">
                  <ExternalLinks film={film} />
                </td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(film.movieId)}
                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                  >
                    Details<span className="sr-only"> for {titleWithoutYear(film.title)}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One film in the grid: its poster, then the same three numbers the table shows.
 * The title is the control that opens the film; its hit area also covers the
 * poster, so the poster is clickable without being a second tab stop.
 */
function FilmCard({
  film,
  selected,
  full,
  onToggleCompare,
  onOpenDetail
}: {
  film: MovieSummary;
  selected: boolean;
  full: boolean;
  onToggleCompare: (film: MovieSummary) => void;
  onOpenDetail: (id: number) => void;
}) {
  const { tiltRef, areaProps } = usePosterTilt();
  return (
    <li className="group relative flex min-w-0 flex-col" {...areaProps}>
      <FilmPoster
        film={{
          movieId: film.movieId,
          title: film.title,
          year: film.year,
          genres: film.genreList,
          avgRating: film.avgRating,
          ratingCount: film.ratingCount,
          adjusted: film.weightedRating
        }}
        tmdbId={film.tmdbId}
        tiltRef={tiltRef}
        className={clsx('rounded-control', selected && 'outline-2 outline-offset-4 outline-accent')}
      />
      <button
        type="button"
        onClick={() => onOpenDetail(film.movieId)}
        className="mt-3.5 rounded-sm text-left text-[15px] font-semibold leading-snug text-ink underline-offset-4 after:absolute after:inset-x-0 after:top-0 after:aspect-[2/3] hover:underline group-hover:text-accent"
      >
        <span className="line-clamp-2">{titleWithoutYear(film.title)}</span>
      </button>
      <p className="mb-3 mt-1 truncate text-[13px] text-ink-2">
        {film.year ?? 'Year unknown'} · {film.genreList.length > 0 ? film.genreList.join(', ') : 'No genres listed'}
      </p>
      {/* Pushed to the foot of the card, so the figures line up across a row whatever the title length. */}
      <dl className="mt-auto grid grid-cols-3 gap-x-2 border-t border-line pt-3">
        <Metric
          size="sm"
          label={
            <>
              Average<span className="sr-only"> rating</span>
            </>
          }
          value={formatScore(film.avgRating)}
        />
        <Metric size="sm" label="Ratings" value={formatCount(film.ratingCount)} />
        <Metric
          size="sm"
          label={
            <>
              Adjusted<span className="sr-only"> score</span>
            </>
          }
          value={formatScore(film.weightedRating)}
          accent
        />
      </dl>
      <div className="mt-3">
        <CompareCheckbox film={film} checked={selected} full={full} onToggle={onToggleCompare} withLabel />
      </div>
    </li>
  );
}

/** Grid view: a wall of posters, built for browsing. Every card carries the same three numbers. */
function ResultsGrid({ films, selectedIds, onToggleCompare, onOpenDetail }: ResultsProps) {
  const full = selectedIds.length >= MAX_COMPARE;
  return (
    <>
      <p className="mb-5 max-w-[78ch] text-[13px] leading-relaxed text-ink-2">
        Each poster is drawn from the film’s own numbers: one speck of light for every rating, a disc at the height of
        its average, and an amber line at its adjusted score.
        {TMDB_ENABLED && ` Where TMDB has a poster for the film, that is shown instead. ${TMDB_NOTICE}`}
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {films.map((film) => (
          <FilmCard
            key={film.movieId}
            film={film}
            selected={selectedIds.includes(film.movieId)}
            full={full}
            onToggleCompare={onToggleCompare}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </ul>
    </>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const step = buttonClass({ variant: 'secondary', size: 'sm' });
  return (
    <nav aria-label="Result pages" className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-ink-2 tabular-nums">
        Page <span className="font-semibold text-ink">{formatCount(page)}</span> of {formatCount(totalPages)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={step} disabled={page <= 1} onClick={() => onPage(1)}>
          First
        </button>
        <button type="button" className={step} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </button>
        <button type="button" className={step} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={step} disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
          Last
        </button>
      </div>
    </nav>
  );
}

/** Stays at the bottom of the window while films are selected, so Compare is always within reach. */
function CompareTray({
  selected,
  onRemove,
  onClear,
  onCompare
}: {
  selected: Selection[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onCompare: () => void;
}) {
  if (selected.length === 0) return null;
  const hint =
    selected.length < 2
      ? 'Select at least 2 films to compare.'
      : selected.length >= MAX_COMPARE
        ? COMPARE_FULL
        : null;

  return (
    <section
      aria-label="Films selected for comparison"
      className="sticky bottom-0 z-10 -mx-4 border-t border-line-strong bg-surface-2 px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-t-panel lg:border-x"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="text-sm font-semibold text-ink tabular-nums">
          Compare: {selected.length} of {MAX_COMPARE}
        </p>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {selected.map((film) => (
            <li
              key={film.id}
              className="inline-flex max-w-full items-center gap-1 rounded-control bg-canvas py-1 pl-2.5 pr-1 text-[13px] text-ink"
            >
              <span className="truncate">{film.title}</span>
              <button
                type="button"
                onClick={() => onRemove(film.id)}
                aria-label={`Remove ${film.title} from the comparison`}
                className="flex size-5 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClear} className={buttonClass({ variant: 'quiet' })}>
            Clear
          </button>
          <button
            type="button"
            onClick={onCompare}
            disabled={selected.length < 2}
            aria-describedby={hint ? 'compare-hint' : undefined}
            className={buttonClass({ variant: 'primary' })}
          >
            Compare films
          </button>
        </div>
      </div>
      {hint && (
        <p id="compare-hint" role="status" className="mt-2 text-[13px] text-ink-2">
          {hint}
        </p>
      )}
    </section>
  );
}

export default function MovieExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL is the single source of truth for every filter, the sort, the page and the view.
  const state = useMemo(() => parseExplorerParams(searchParams), [searchParams]);
  const dataKey = useMemo(() => toSearchParams({ ...state, view: 'table' }).toString(), [state]);

  const movies = useQuery(`movies?${dataKey}`, (signal) => api.getMovies(toApiQuery(state), signal));
  const genres = useQuery('genres', () => api.getGenres());

  // Text and number fields are drafts until submitted. When the URL changes (Back, a chip, Reset), they follow it.
  const applied = draftFrom(state);
  const appliedKey = JSON.stringify(applied);
  const [draft, setDraft] = useState(applied);
  const [syncedKey, setSyncedKey] = useState(appliedKey);
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey);
    setDraft(applied);
  }

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const filtersId = useId();

  /**
   * Apply a change to the URL. Anything except a page or view change returns to page 1.
   * Each change builds on the address bar as it is at that moment, not on the last
   * render, so two changes in quick succession can't overwrite each other.
   */
  const update = (change: Partial<ExplorerState> | ((current: ExplorerState) => Partial<ExplorerState>)) => {
    const current = readUrl();
    const patch = typeof change === 'function' ? change(current) : change;
    const next = { ...current, ...patch };
    const keepsPage = 'page' in patch || (Object.keys(patch).length === 1 && 'view' in patch);
    if (!keepsPage) next.page = 1;
    setSearchParams(toSearchParams(next));
  };

  // The API clamps a page number past the end. Keep the URL in step with the page actually shown.
  const shownPage = movies.status === 'ready' ? movies.data.page : null;
  useEffect(() => {
    if (shownPage !== null && shownPage !== state.page) {
      setSearchParams(toSearchParams({ ...state, page: shownPage }), { replace: true });
    }
  }, [shownPage, state, setSearchParams]);

  const minYear = toNumber(draft.minYear);
  const maxYear = toNumber(draft.maxYear);
  const yearsReversed = minYear !== null && maxYear !== null && minYear > maxYear;
  const hasUnappliedChanges = JSON.stringify(draft) !== appliedKey;

  const applyDraft = (event: FormEvent) => {
    event.preventDefault();
    if (yearsReversed) return;
    update({
      search: draft.search.trim(),
      minRating: toNumber(draft.minRating),
      minCount: Math.max(0, Math.trunc(toNumber(draft.minCount) ?? 0)),
      minYear,
      maxYear
    });
  };

  const resetFilters = () => setSearchParams(toSearchParams({ ...DEFAULT_STATE, view: readUrl().view }));

  const toggleGenre = (genre: string) =>
    update((current) => ({
      genres: current.genres.includes(genre)
        ? current.genres.filter((other) => other !== genre)
        : [...current.genres, genre]
    }));

  const changeSort = (key: SortKey) =>
    update((current) =>
      current.sortBy === key
        ? { sortOrder: current.sortOrder === 'desc' ? 'asc' : 'desc' }
        : { sortBy: key, sortOrder: defaultOrderFor(key) }
    );

  const changePage = (page: number) => {
    update({ page });
    resultsRef.current?.scrollIntoView({ block: 'start' });
  };

  const toggleCompare = (film: MovieSummary) =>
    setSelected((current) => {
      if (current.some((item) => item.id === film.movieId)) return current.filter((item) => item.id !== film.movieId);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, { id: film.movieId, title: titleWithoutYear(film.title) }];
    });

  const chips = activeFilterChips(state);
  const selectedIds = selected.map((film) => film.id);
  const films = movies.status === 'ready' ? movies.data.movies : [];
  const total = movies.status === 'ready' ? movies.data.total : null;
  const failure = movies.status === 'error' ? describeError(movies.error, 'films') : null;

  // A failed request has no count. It must never read as "0 films".
  let summary = '';
  if (movies.status === 'loading') summary = 'Loading films…';
  else if (total === 0) summary = 'No films match';
  else if (total !== null) {
    const first = (state.page - 1) * PAGE_SIZE + 1;
    summary = `Showing ${formatCount(first)}–${formatCount(first + films.length - 1)} of ${formatCount(total)} films`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movies"
        description="Search, filter and compare every film in the dataset. The adjusted score is a Bayesian average: it weighs a film’s average rating by how many people rated it."
        actions={
          <div role="group" aria-label="View" className="flex gap-1">
            {(
              [
                { view: 'table', label: 'Table', icon: List },
                { view: 'grid', label: 'Grid', icon: LayoutGrid }
              ] as const
            ).map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                type="button"
                aria-pressed={state.view === view}
                onClick={() => update({ view })}
                className={clsx(
                  'inline-flex h-9 items-center gap-2 rounded-control px-3 text-sm font-medium transition-colors duration-150',
                  state.view === view ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink'
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        }
      />

      <form onSubmit={applyDraft} role="search" aria-label="Films" className="lit-panel rounded-panel bg-surface-1 p-4 sm:p-5">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search films by title
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              name="search"
              value={draft.search}
              onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              placeholder="Search by title, e.g. Matrix"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-12 w-full rounded-control border border-line-strong bg-canvas pl-11 pr-3 text-base text-ink placeholder:text-ink-2 transition-colors duration-150 hover:border-ink-2"
            />
          </div>
          <button type="submit" className={buttonClass({ variant: 'primary', size: 'lg' })}>
            Search
          </button>
        </div>

        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
          className={buttonClass({ variant: 'secondary', className: 'mt-3 lg:hidden' })}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtersOpen ? 'Hide filters' : 'Show filters'}
          {chips.length > 0 && <span className="font-normal text-ink-2 tabular-nums">({chips.length} active)</span>}
        </button>

        <div
          id={filtersId}
          className={clsx(
            'mt-4 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end',
            filtersOpen ? 'grid' : 'hidden'
          )}
        >
          <div className="col-span-2 sm:col-span-1">
            <GenrePicker
              options={genres.status === 'ready' ? genres.data.map((genre) => genre.genre) : null}
              failed={genres.status === 'error'}
              onRetry={genres.retry}
              selected={state.genres}
              mode={state.genreMode}
              onToggle={toggleGenre}
              onModeChange={(genreMode) => update({ genreMode })}
              onClear={() => update({ genres: [] })}
            />
          </div>
          <div>
            <label htmlFor={`${filtersId}-rating`} className={FIELD_LABEL}>
              Min. average rating
            </label>
            <input
              id={`${filtersId}-rating`}
              type="number"
              name="minRating"
              min={0}
              max={5}
              step={0.5}
              inputMode="decimal"
              value={draft.minRating}
              onChange={(event) => setDraft({ ...draft, minRating: event.target.value })}
              placeholder="0 to 5"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`${filtersId}-count`} className={FIELD_LABEL}>
              Min. rating count
            </label>
            <input
              id={`${filtersId}-count`}
              type="number"
              name="minCount"
              min={0}
              step={1}
              inputMode="numeric"
              value={draft.minCount}
              onChange={(event) => setDraft({ ...draft, minCount: event.target.value })}
              placeholder="Any"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`${filtersId}-from`} className={FIELD_LABEL}>
              Released from
            </label>
            <input
              id={`${filtersId}-from`}
              type="number"
              name="minYear"
              min={1800}
              max={2100}
              step={1}
              inputMode="numeric"
              value={draft.minYear}
              onChange={(event) => setDraft({ ...draft, minYear: event.target.value })}
              placeholder="Year"
              aria-invalid={yearsReversed || undefined}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`${filtersId}-to`} className={FIELD_LABEL}>
              Released up to
            </label>
            <input
              id={`${filtersId}-to`}
              type="number"
              name="maxYear"
              min={1800}
              max={2100}
              step={1}
              inputMode="numeric"
              value={draft.maxYear}
              onChange={(event) => setDraft({ ...draft, maxYear: event.target.value })}
              placeholder="Year"
              aria-invalid={yearsReversed || undefined}
              className={FIELD}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-1">
            <button type="submit" className={buttonClass({ variant: 'secondary' })}>
              Apply
            </button>
            <button type="button" onClick={resetFilters} className={buttonClass({ variant: 'quiet' })}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        {yearsReversed ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            “Released from” can’t be later than “Released up to”.
          </p>
        ) : (
          hasUnappliedChanges && (
            <p role="status" className="mt-3 text-[13px] text-ink-2">
              You have changes that aren’t applied yet. Press Search or Apply.
            </p>
          )
        )}
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span id={`${filtersId}-chips`} className="text-[13px] text-ink-2">
            Active filters:
          </span>
          <ul aria-labelledby={`${filtersId}-chips`} className="contents">
            {chips.map((chip) => (
              <li
                key={chip.id}
                className="inline-flex items-center gap-1 rounded-control bg-accent/15 py-1 pl-2.5 pr-1 text-[13px] font-medium text-ink"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => update(chip.clear)}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="flex size-5 items-center justify-center rounded-sm text-ink-2 hover:bg-canvas/50 hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 rounded-sm text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
          >
            Reset all
          </button>
        </div>
      )}

      <div ref={resultsRef} className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div role="group" aria-label="Sort films" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-ink-2">Sort by</span>
            {SORT_OPTIONS.map((option) => {
              const active = state.sortBy === option.key;
              const Arrow = state.sortOrder === 'desc' ? ArrowDown : ArrowUp;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeSort(option.key)}
                  className={clsx(
                    'inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-[13px] font-medium transition-colors duration-150',
                    active ? 'bg-accent/15 text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  {option.label}
                  {active && (
                    <>
                      <Arrow className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">, {state.sortOrder === 'desc' ? 'descending' : 'ascending'}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p role="status" className="text-sm text-ink-2 tabular-nums">
            {summary}
          </p>
        </div>

        {movies.status === 'loading' && (
          <div className="min-h-[24rem] rounded-panel bg-surface-1">
            <LoadingSpinner text="Loading films…" />
          </div>
        )}
        {failure && <ErrorState title={failure.title} message={failure.message} onRetry={movies.retry} />}
        {movies.status === 'ready' && films.length === 0 && (
          <EmptyState
            title="No films match these filters"
            message="Try a shorter search, fewer genres, or a lower minimum."
            action={
              <button type="button" onClick={resetFilters} className={buttonClass({ variant: 'secondary' })}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset filters
              </button>
            }
          />
        )}
        {films.length > 0 &&
          (state.view === 'table' ? (
            <>
              <ResultsTable
                films={films}
                selectedIds={selectedIds}
                onToggleCompare={toggleCompare}
                onOpenDetail={setDetailId}
                sort={state}
              />
              <p className="text-[13px] text-ink-2 lg:hidden">
                Scroll the table sideways for every column, or switch to Grid.
              </p>
            </>
          ) : (
            <ResultsGrid films={films} selectedIds={selectedIds} onToggleCompare={toggleCompare} onOpenDetail={setDetailId} />
          ))}

        {movies.status === 'ready' && (
          <Pagination page={state.page} totalPages={movies.data.totalPages} onPage={changePage} />
        )}
      </div>

      <CompareTray
        selected={selected}
        onRemove={(id) => setSelected((current) => current.filter((film) => film.id !== id))}
        onClear={() => setSelected([])}
        onCompare={() => setCompareOpen(true)}
      />

      <MovieDetailDrawer movieId={detailId} onClose={() => setDetailId(null)} />
      <MovieCompareDialog
        open={compareOpen}
        movieIds={selectedIds}
        onClose={() => setCompareOpen(false)}
        onClearSelection={() => setSelected([])}
      />
    </div>
  );
}
