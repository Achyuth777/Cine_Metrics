import clsx from 'clsx';
import { X } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../hooks/useQuery';
import { describeError, formatCount, formatScore, genreText, titleWithoutYear } from '../../lib/format';
import type { MovieComparisonResponse, MovieDetail } from '../../types';
import { ErrorState, LoadingSpinner } from '../LoadingState';
import { buttonClass } from '../system/buttonClass';
import Dialog from '../system/Dialog';
import RatingDistributionChart from './RatingDistributionChart';

const CHART_COLUMNS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4'
};

const ROWS: { label: string; note?: string; accent?: boolean; value: (film: MovieDetail) => string }[] = [
  { label: 'Average rating', note: 'out of 5', value: (film) => formatScore(film.avgRating) },
  { label: 'Rating count', value: (film) => formatCount(film.ratingCount) },
  { label: 'Adjusted score', note: 'Bayesian', accent: true, value: (film) => formatScore(film.weightedRating) },
  {
    label: 'Rank by rating count',
    value: (film) => (film.rankMostRated ? `#${formatCount(film.rankMostRated)}` : '—')
  }
];

function Comparison({ data }: { data: MovieComparisonResponse }) {
  return (
    <div className="space-y-8">
      <div className="rounded-control bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink">
        <p>{data.analysisSummary}</p>
        {data.commonGenres.length > 0 && (
          <p className="mt-1.5 text-sm text-ink-2">Genres in common: {data.commonGenres.join(', ')}.</p>
        )}
      </div>

      <div className="relative overflow-x-auto" role="region" aria-label="Film comparison, scrollable table" tabIndex={0}>
        <table className="w-full text-left text-sm" style={{ minWidth: `${10 + data.movies.length * 11}rem` }}>
          <thead>
            <tr className="border-b border-line align-bottom">
              <th scope="col" className="w-40 py-3 pr-4 text-[13px] font-medium text-ink-2">
                Measure
              </th>
              {data.movies.map((film) => (
                <th key={film.movieId} scope="col" className="px-3 py-3 font-semibold text-ink">
                  {titleWithoutYear(film.title)}
                  <span className="mt-0.5 block text-[13px] font-normal text-ink-2">
                    {film.year ?? 'Year unknown'} · {genreText(film.genres)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="py-3 pr-4 text-[13px] font-medium text-ink-2">
                  {row.label}
                  {row.note && <span className="block text-xs font-normal">{row.note}</span>}
                </th>
                {data.movies.map((film) => (
                  <td
                    key={film.movieId}
                    className={clsx(
                      'px-3 py-3 text-lg font-semibold tabular-nums',
                      row.accent ? 'text-accent' : 'text-ink'
                    )}
                  >
                    {row.value(film)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="compare-distribution">
        <h3 id="compare-distribution" className="text-sm font-semibold text-ink">
          Ratings by star value
        </h3>
        <ul className={clsx('mt-4 grid gap-6', CHART_COLUMNS[data.movies.length])}>
          {data.movies.map((film) => (
            <li key={film.movieId}>
              <p className="mb-2 truncate text-sm text-ink-2">{titleWithoutYear(film.title)}</p>
              <RatingDistributionChart
                distribution={film.ratingDistribution}
                caption={`Ratings by star value for ${titleWithoutYear(film.title)}`}
                height={150}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type MovieCompareDialogProps = {
  open: boolean;
  /** Two to four film ids. */
  movieIds: number[];
  onClose: () => void;
  onClearSelection: () => void;
};

/** Two to four films side by side: one table of the measures, then each film's rating spread. */
export default function MovieCompareDialog({ open, movieIds, onClose, onClearSelection }: MovieCompareDialogProps) {
  const comparison = useQuery(open && movieIds.length >= 2 ? `compare-${movieIds.join(',')}` : null, () =>
    api.compareMovies(movieIds)
  );
  const failure = comparison.status === 'error' ? describeError(comparison.error, 'the comparison') : null;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="compare-title" variant="modal">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-6">
        <h2 id="compare-title" className="text-lg font-semibold text-ink">
          Compare films
          <span className="ml-2 text-sm font-normal text-ink-2 tabular-nums">{movieIds.length} selected</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comparison"
          className={buttonClass({ variant: 'quiet', size: 'icon' })}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        {comparison.status === 'ready' && <Comparison data={comparison.data} />}
        {comparison.status === 'loading' && <LoadingSpinner text="Loading the comparison…" />}
        {failure && <ErrorState title={failure.title} message={failure.message} onRetry={comparison.retry} />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            onClearSelection();
            onClose();
          }}
          className={buttonClass({ variant: 'quiet' })}
        >
          Clear selection
        </button>
        <button type="button" onClick={onClose} className={buttonClass({ variant: 'secondary' })}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
