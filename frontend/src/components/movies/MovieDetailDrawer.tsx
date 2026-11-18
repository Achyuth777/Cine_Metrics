import { ExternalLink, X } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../hooks/useQuery';
import { describeError, formatCount, formatScore, genreText, titleWithoutYear } from '../../lib/format';
import type { MovieDetail } from '../../types';
import { ErrorState, LoadingSpinner } from '../LoadingState';
import { buttonClass } from '../system/buttonClass';
import Dialog from '../system/Dialog';
import Metric from '../system/Metric';
import ScoreScale, { ScoreScaleKey } from '../system/ScoreScale';
import RatingDistributionChart from './RatingDistributionChart';

const SECTION_HEADING = 'text-sm font-semibold text-ink';

function ExternalLinks({ film }: { film: MovieDetail }) {
  if (!film.imdbUrl && !film.tmdbUrl) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {film.imdbUrl && (
        <a href={film.imdbUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary' })}>
          IMDb page
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      {film.tmdbUrl && (
        <a href={film.tmdbUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary' })}>
          TMDb page
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

function FilmDetail({ film }: { film: MovieDetail }) {
  const formula = film.bayesianFormula;
  const name = titleWithoutYear(film.title);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold leading-tight tracking-tight text-ink">{name}</h3>
        <p className="mt-1.5 text-sm text-ink-2">
          {film.year ?? 'Year unknown'} · {genreText(film.genres) || 'No genres listed'}
        </p>
        {film.isHiddenGem && (
          <p className="mt-3 text-sm text-ink-2">
            <span className="mr-2 rounded-sm bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">Hidden gem</span>
            Rated 4.0 or higher on average by 5 to 50 people.
          </p>
        )}
      </div>

      <div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
          <Metric label="Average rating" note="out of 5" value={formatScore(film.avgRating)} />
          <Metric label="Rating count" value={formatCount(film.ratingCount)} />
          <Metric label="Adjusted score" note="Bayesian" value={formatScore(film.weightedRating)} accent />
          <Metric
            label="Rank by rating count"
            value={film.rankMostRated ? `#${formatCount(film.rankMostRated)}` : '—'}
          />
        </dl>
        <ScoreScale
          className="mt-6"
          average={film.avgRating}
          adjusted={film.weightedRating}
          mean={formula?.C}
          showEnds
        />
        <ScoreScaleKey showMean={formula !== null && formula !== undefined} className="mt-2" />
      </div>

      <section aria-labelledby="detail-distribution">
        <h4 id="detail-distribution" className={SECTION_HEADING}>
          Ratings by star value
        </h4>
        <p className="mb-3 mt-1 text-[13px] text-ink-2">Counted from the ratings file.</p>
        <RatingDistributionChart distribution={film.ratingDistribution} caption={`Ratings by star value for ${name}`} />
      </section>

      {formula && (
        <section aria-labelledby="detail-formula">
          <h4 id="detail-formula" className={SECTION_HEADING}>
            How the adjusted score is calculated
          </h4>
          <p className="mt-3 overflow-x-auto rounded-control bg-surface-2 px-3 py-2.5 text-sm whitespace-nowrap text-ink tabular-nums">
            {formula.formula}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5 text-sm">
            <dt className="font-semibold text-ink">v</dt>
            <dd className="text-ink-2">ratings this film received</dd>
            <dd className="text-right text-ink tabular-nums">{formatCount(formula.v)}</dd>
            <dt className="font-semibold text-ink">R</dt>
            <dd className="text-ink-2">this film’s average rating</dd>
            <dd className="text-right text-ink tabular-nums">{formatScore(formula.R, 4)}</dd>
            <dt className="font-semibold text-ink">m</dt>
            <dd className="text-ink-2">weight given to the dataset average</dd>
            <dd className="text-right text-ink tabular-nums">{formula.m}</dd>
            <dt className="font-semibold text-ink">C</dt>
            <dd className="text-ink-2">average of all ratings in the dataset</dd>
            <dd className="text-right text-ink tabular-nums">{formatScore(formula.C, 4)}</dd>
            <dt className="font-semibold text-accent">WR</dt>
            <dd className="text-ink-2">adjusted score</dd>
            <dd className="text-right font-semibold text-accent tabular-nums">{formatScore(formula.WR, 4)}</dd>
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            With few ratings the score stays near the dataset average. As ratings accumulate it moves toward the film’s
            own average.
          </p>
        </section>
      )}

      <ExternalLinks film={film} />
    </div>
  );
}

type MovieDetailDrawerProps = {
  /** The film to show, or null when the drawer is closed. */
  movieId: number | null;
  onClose: () => void;
};

/** One film in full: its three numbers, where they sit on the scale, the rating spread, and the formula. */
export default function MovieDetailDrawer({ movieId, onClose }: MovieDetailDrawerProps) {
  const film = useQuery(movieId === null ? null : `movie-${movieId}`, () => api.getMovie(movieId as number));
  const failure = film.status === 'error' ? describeError(film.error, 'this film') : null;

  return (
    <Dialog open={movieId !== null} onClose={onClose} labelledBy="movie-detail-title" variant="drawer">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-6">
        <h2 id="movie-detail-title" className="text-sm font-semibold text-ink-2">
          Film details
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close film details"
          className={buttonClass({ variant: 'quiet', size: 'icon' })}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        {film.status === 'ready' && <FilmDetail film={film.data} />}
        {film.status === 'loading' && <LoadingSpinner text="Loading film details…" />}
        {failure && <ErrorState title={failure.title} message={failure.message} onRetry={film.retry} />}
      </div>

      <div className="border-t border-line px-5 py-3 sm:px-6">
        <button type="button" onClick={onClose} className={buttonClass({ variant: 'secondary', className: 'w-full' })}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
