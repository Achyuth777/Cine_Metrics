import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../api';
import { ErrorState, LoadingSpinner } from '../components/LoadingState';
import PageHeader from '../components/system/PageHeader';
import ScrollHint from '../components/system/ScrollHint';
import { buttonClass } from '../components/system/buttonClass';
import { useQuery } from '../hooks/useQuery';
import { explorerPath } from '../lib/explorerParams';
import { describeError, formatCount, formatScore } from '../lib/format';
import type { GenreStats } from '../types';

type SortKey = 'ratingCount' | 'movieCount' | 'avgRating' | 'perFilm' | 'genre';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'ratingCount', label: 'Ratings' },
  { key: 'movieCount', label: 'Films' },
  { key: 'avgRating', label: 'Average rating' },
  { key: 'perFilm', label: 'Ratings per film' },
  { key: 'genre', label: 'Name' }
];
const MIN_FILMS = [0, 100, 500, 1000];

const perFilm = (g: GenreStats) => (g.movieCount > 0 ? g.ratingCount / g.movieCount : 0);
const valueOf = (g: GenreStats, key: SortKey) => (key === 'perFilm' ? perFilm(g) : key === 'genre' ? 0 : g[key]);

function signed(value: number) {
  if (Math.abs(value) < 0.005) return '±0.00';
  return `${value > 0 ? '+' : '−'}${formatScore(Math.abs(value))}`;
}

export default function GenreAnalyticsPage() {
  const genres = useQuery('genres', () => api.getGenres());
  const overview = useQuery('overview', () => api.getOverview());
  const [sort, setSort] = useState<SortKey>('ratingCount');
  const [descending, setDescending] = useState(true);
  const [minFilms, setMinFilms] = useState(0);
  const filterId = useId();

  const rows = useMemo(() => {
    if (genres.status !== 'ready') return [];
    const kept = genres.data.filter((g) => g.movieCount >= minFilms);
    const sorted = [...kept].sort((a, b) =>
      sort === 'genre' ? a.genre.localeCompare(b.genre) : valueOf(b, sort) - valueOf(a, sort)
    );
    return descending === (sort !== 'genre') ? sorted : sorted.reverse();
  }, [genres, sort, descending, minFilms]);

  const header = (
    <PageHeader
      title="Genres"
      description="How much each genre is watched and how well it is rated. Rank by any column, then open a genre in the Explorer."
    />
  );

  if (genres.status === 'error') {
    const failure = describeError(genres.error, 'genre figures');
    return (
      <div className="space-y-8">
        {header}
        <ErrorState title={failure.title} message={failure.message} onRetry={genres.retry} />
      </div>
    );
  }
  if (genres.status !== 'ready') {
    return (
      <div className="space-y-8">
        {header}
        <LoadingSpinner text="Loading genre figures…" />
      </div>
    );
  }

  const all = genres.data;
  const tagTotal = all.reduce((sum, g) => sum + g.movieCount, 0);
  const ratingTotal = all.reduce((sum, g) => sum + g.ratingCount, 0);
  const mean = overview.status === 'ready' ? overview.data.globalAverageRating : null;
  const maxRatings = Math.max(...all.map((g) => g.ratingCount));

  const chooseSort = (key: SortKey) => {
    if (key === sort) setDescending((d) => !d);
    else {
      setSort(key);
      setDescending(key !== 'genre');
    }
  };

  return (
    <div className="space-y-8">
      {header}

      <section aria-labelledby="overlap-title" className="lit-panel rounded-panel bg-surface-1 p-5 sm:p-6">
        <h2 id="overlap-title" className="text-lg font-semibold text-ink">
          Genres overlap, so totals add up to more than the dataset
        </h2>
        <p className="mt-2 max-w-[72ch] text-[15px] leading-relaxed text-ink-2">
          A film can carry several genres. <em>Toy Story</em>, for example, is Adventure, Animation, Children, Comedy and
          Fantasy, so it is counted in all five. Added up across genres, the table below holds{' '}
          <strong className="font-semibold text-ink">{formatCount(tagTotal)} film entries</strong>
          {overview.status === 'ready' && <>, though the dataset has {formatCount(overview.data.totalMovies)} films</>}, and{' '}
          <strong className="font-semibold text-ink">{formatCount(ratingTotal)} rating entries</strong>
          {overview.status === 'ready' && <> against {formatCount(overview.data.totalRatings)} ratings</>}. Compare genres with
          each other; do not add them up.
        </p>
      </section>

      <section aria-labelledby="ranking-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="ranking-title" className="text-lg font-semibold text-ink">
            {all.length} genres, ranked
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={filterId} className="text-[13px] text-ink-2">
              Show genres with
            </label>
            <select
              id={filterId}
              value={minFilms}
              onChange={(event) => setMinFilms(Number(event.target.value))}
              className="h-9 rounded-control border border-line-strong bg-canvas px-2.5 text-sm text-ink hover:border-ink-2"
            >
              {MIN_FILMS.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? 'any number of films' : `${formatCount(value)}+ films`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-2" role="group" aria-label="Rank by">
          <span className="mr-2 text-[13px] text-ink-2">Rank by</span>
          {SORTS.map((option) => {
            const active = sort === option.key;
            // The arrow shows the order on screen: down for highest (or A) first.
            const Arrow = descending === (option.key !== 'genre') ? ArrowDown : ArrowUp;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                title={active ? 'Select again to reverse the order' : undefined}
                onClick={() => chooseSort(option.key)}
                className={clsx(buttonClass({ variant: 'quiet', size: 'sm' }), active && 'bg-accent/15 text-accent')}
              >
                {option.label}
                {active && <Arrow className="size-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {rows.length > 0 && <ScrollHint>Swipe the table sideways for films, ratings per film and averages.</ScrollHint>}
        {rows.length === 0 ? (
          <p className="rounded-panel border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-2">
            No genre has that many films. Choose a lower minimum.
          </p>
        ) : (
          <div className="relative overflow-x-auto rounded-panel bg-surface-1" role="region" aria-label="Genre ranking, scrollable table" tabIndex={0}>
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">
                Genres ranked by {SORTS.find((s) => s.key === sort)?.label.toLowerCase()}, {descending ? 'highest' : 'lowest'} first.
              </caption>
              <thead className="text-[13px] text-ink-2">
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pl-5 pr-2 font-medium">#</th>
                  <th scope="col" className="px-2 py-3 font-medium">Genre</th>
                  <th scope="col" className="px-2 py-3 font-medium">Ratings (count)</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">Films (count)</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">Ratings per film</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">Average rating (stars)</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">vs dataset average</th>
                  <th scope="col" className="py-3 pl-2 pr-5 font-medium">
                    <span className="sr-only">Open in the Explorer</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((g, index) => (
                  <tr key={g.genre} className="transition-colors duration-150 hover:bg-surface-2/60">
                    <td className="py-2.5 pl-5 pr-2 text-ink-2">{index + 1}</td>
                    <th scope="row" className="px-2 py-2.5 font-semibold text-ink">{g.genre}</th>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 shrink-0 rounded-full bg-surface-2" aria-hidden="true">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${(g.ratingCount / maxRatings) * 100}%` }} />
                        </div>
                        <span className="text-ink">{formatCount(g.ratingCount)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-ink">{formatCount(g.movieCount)}</td>
                    <td className="px-2 py-2.5 text-right text-ink">{perFilm(g).toFixed(1)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-ink">{formatScore(g.avgRating)}</td>
                    <td className="px-2 py-2.5 text-right text-ink-2">
                      {mean === null ? '—' : signed(g.avgRating - mean)}
                    </td>
                    <td className="py-2.5 pl-2 pr-5 text-right">
                      <Link to={explorerPath({ genres: [g.genre] })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm text-[13px] font-semibold text-accent underline-offset-4 hover:underline">
                        Films<span className="sr-only"> in {g.genre}</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[13px] leading-relaxed text-ink-2">
          Ratings: every rating given to a film in the genre. Films: rated films carrying the genre. Average: mean of those
          ratings, out of 5{mean !== null && <>; the dataset average is {formatScore(mean)}</>}.
        </p>
      </section>
    </div>
  );
}
