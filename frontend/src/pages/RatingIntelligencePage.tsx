import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BayesPullChart from '../components/bayes/BayesPullChart';
import { EmptyState, ErrorState, LoadingSpinner } from '../components/LoadingState';
import BarList from '../components/system/BarList';
import Metric from '../components/system/Metric';
import PageHeader from '../components/system/PageHeader';
import ScrollHint from '../components/system/ScrollHint';
import { buttonClass } from '../components/system/buttonClass';
import { useQuery } from '../hooks/useQuery';
import { PRIOR_WEIGHT } from '../lib/bayesPull';
import { explorerSearchPath } from '../lib/explorerParams';
import { describeError, formatCount, formatScore, titleWithoutYear } from '../lib/format';

const PANEL = 'lit-panel rounded-panel bg-surface-1 p-5 sm:p-6';
const TITLE = 'text-lg font-semibold text-ink';
const FIELD = 'h-10 w-24 rounded-control border border-line-strong bg-canvas px-3 text-sm text-ink hover:border-ink-2';
const LABEL = 'mb-1.5 block text-[13px] font-medium text-ink-2';

function Failed({ error, subject, retry }: { error: unknown; subject: string; retry: () => void }) {
  const failure = describeError(error, subject);
  return <ErrorState title={failure.title} message={failure.message} onRetry={retry} />;
}

/** Two real films: a perfect average from one rating, and the top film by adjusted score. */
function OneVoteOrHundreds() {
  const pair = useQuery('ratings-pair', async (signal) => {
    const [single, leader] = await Promise.all([
      api.getMovies({ sortBy: 'avgRating', sortOrder: 'desc', pageSize: 1, minCount: 1, minRating: 5 }, signal),
      api.getMovies({ sortBy: 'weightedRating', sortOrder: 'desc', pageSize: 1, minCount: 5 }, signal)
    ]);
    return [single.movies[0], leader.movies[0]].filter(Boolean);
  });
  if (pair.status === 'error') return <Failed error={pair.error} subject="the example films" retry={pair.retry} />;
  if (pair.status !== 'ready') return <LoadingSpinner text="Loading two example films…" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pair.data.map((film) => (
        <div key={film.movieId} className="rounded-control bg-surface-2/60 p-4">
          <Link to={explorerSearchPath(film.title)} className="rounded-sm font-semibold text-ink underline-offset-4 hover:text-accent hover:underline">
            {titleWithoutYear(film.title)}
          </Link>
          <span className="ml-2 text-[13px] text-ink-2">{film.year}</span>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <Metric label="Average rating" value={formatScore(film.avgRating)} />
            <Metric label={film.ratingCount === 1 ? 'Rating' : 'Ratings'} value={formatCount(film.ratingCount)} />
            <Metric label="Adjusted score" value={formatScore(film.weightedRating)} accent />
          </dl>
        </div>
      ))}
    </div>
  );
}

function Formula() {
  const overview = useQuery('overview', () => api.getOverview());
  const mean = overview.status === 'ready' ? formatScore(overview.data.globalAverageRating, 4) : '…';
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
      <p className="rounded-control bg-canvas px-4 py-3 font-mono text-sm text-ink">adjusted score = (v ÷ (v + m)) × R + (m ÷ (v + m)) × C</p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold text-ink">v</dt> <dd className="inline">the film’s number of ratings</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">R</dt> <dd className="inline">the film’s average rating</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">m = {PRIOR_WEIGHT}</dt>{' '}
          <dd className="inline">how many “average” ratings every film starts with</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">C = {mean}</dt> <dd className="inline">the average of every rating in the dataset</dd>
        </div>
      </dl>
      <p className="text-[13px]">
        Where it is computed: <code className="text-ink">backend/data_loader.py</code>, <code className="text-ink">_compute_weighted_rating</code>,
        for every film the API serves. The Hadoop job <code className="text-ink">HiddenGemsJob.java</code> uses the same formula with
        m = 10 and C = 3.5 by default, so its stored scores can differ from the API’s in the third decimal.
      </p>
    </div>
  );
}

type Thresholds = { minRating: number; minCount: number; maxCount: number };
const GEM_DEFAULTS: Thresholds = { minRating: 4, minCount: 10, maxCount: 80 };

function HiddenGems() {
  const [applied, setApplied] = useState<Thresholds>(GEM_DEFAULTS);
  const [draft, setDraft] = useState({ minRating: '4', minCount: '10', maxCount: '80' });
  const ratingId = useId();
  const minId = useId();
  const maxId = useId();
  const errorId = useId();
  const gems = useQuery(`gems:${applied.minRating}:${applied.minCount}:${applied.maxCount}`, () =>
    api.getHiddenGems({ limit: 25, ...applied })
  );

  const r = Number(draft.minRating);
  const lo = Number(draft.minCount);
  const hi = Number(draft.maxCount);
  const invalid = !(r >= 0.5 && r <= 5)
    ? 'Minimum average must be between 0.5 and 5.'
    : !(Number.isInteger(lo) && lo >= 1)
      ? 'Fewest ratings must be a whole number, 1 or more.'
      : !(Number.isInteger(hi) && hi >= lo)
        ? 'Most ratings must be a whole number at least as large as the fewest.'
        : null;

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!invalid) setApplied({ minRating: r, minCount: lo, maxCount: hi });
  };

  return (
    <>
      <form onSubmit={apply} className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={ratingId} className={LABEL}>Minimum average</label>
          <input id={ratingId} type="number" step="0.1" min="0.5" max="5" className={FIELD} value={draft.minRating}
            aria-describedby={invalid ? errorId : undefined} onChange={(e) => setDraft({ ...draft, minRating: e.target.value })} />
        </div>
        <div>
          <label htmlFor={minId} className={LABEL}>Fewest ratings</label>
          <input id={minId} type="number" step="1" min="1" className={FIELD} value={draft.minCount}
            aria-describedby={invalid ? errorId : undefined} onChange={(e) => setDraft({ ...draft, minCount: e.target.value })} />
        </div>
        <div>
          <label htmlFor={maxId} className={LABEL}>Most ratings</label>
          <input id={maxId} type="number" step="1" min="1" className={FIELD} value={draft.maxCount}
            aria-describedby={invalid ? errorId : undefined} onChange={(e) => setDraft({ ...draft, maxCount: e.target.value })} />
        </div>
        <button type="submit" disabled={invalid !== null} title={invalid ?? undefined} className={buttonClass({ variant: 'secondary' })}>
          Show films
        </button>
      </form>
      {invalid && <p id={errorId} className="mt-2 text-[13px] text-danger">{invalid}</p>}

      <div className="mt-5">
        {gems.status === 'error' && <Failed error={gems.error} subject="hidden gems" retry={gems.retry} />}
        {gems.status === 'loading' && <LoadingSpinner text="Finding films…" />}
        {gems.status === 'ready' && gems.data.length === 0 && (
          <EmptyState title="No films match" message="Lower the minimum average, or widen the range of ratings." />
        )}
        {gems.status === 'ready' && gems.data.length > 0 && <ScrollHint className="mb-2" />}
        {gems.status === 'ready' && gems.data.length > 0 && (
          <div className="relative overflow-x-auto" role="region" aria-label="Hidden gems, scrollable table" tabIndex={0}>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">
                Films averaging at least {applied.minRating} from {applied.minCount} to {applied.maxCount} ratings, ranked by gem score.
              </caption>
              <thead className="text-[13px] text-ink-2">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">#</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Film</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Average</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Ratings</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Adjusted</th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium">Gem score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {gems.data.map((gem, index) => (
                  <tr key={gem.movieId}>
                    <td className="py-2.5 pr-3 text-ink-2">{index + 1}</td>
                    <th scope="row" className="py-2.5 pr-3 font-medium">
                      <Link to={explorerSearchPath(gem.title)} className="rounded-sm text-ink underline-offset-4 hover:text-accent hover:underline">
                        {titleWithoutYear(gem.title)}
                      </Link>
                      <span className="block text-[13px] font-normal text-ink-2">{gem.year ?? 'Year unknown'}</span>
                    </th>
                    <td className="px-2 py-2.5 text-right text-ink">{formatScore(gem.avgRating)}</td>
                    <td className="px-2 py-2.5 text-right text-ink">{formatCount(gem.ratingCount)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-accent">{formatScore(gem.weightedScore)}</td>
                    <td className="py-2.5 pl-2 text-right text-ink-2">{gem.hiddenGemScore.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        Gem score, as <code className="text-ink">backend/routers/analytics.py</code> computes it: average ÷ log₂(ratings + 2). It
        favours high averages from fewer ratings. It only orders this list; it is not the adjusted score.
      </p>
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="font-semibold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ByDecade() {
  const years = useQuery('ratings-years', () => api.getYearRatings());
  if (years.status === 'error') return <Failed error={years.error} subject="ratings by release year" retry={years.retry} />;
  if (years.status !== 'ready') return <LoadingSpinner text="Loading release years…" />;
  const byDecade = new Map<number, { count: number; sum: number }>();
  for (const y of years.data) {
    const year = Number(y.year);
    if (!Number.isFinite(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    const entry = byDecade.get(decade) ?? { count: 0, sum: 0 };
    entry.count += y.ratingCount;
    entry.sum += y.avgRating * y.ratingCount;
    byDecade.set(decade, entry);
  }
  const rows = [...byDecade.entries()].sort(([a], [b]) => a - b);
  return (
    <>
      <BarList
        caption="Ratings given to films from each release decade, with the average of those ratings."
        labelHeader="Release decade"
        valueHeader="Ratings, and their average in stars"
        rows={rows.map(([decade, e]) => ({
          key: String(decade),
          label: <span className="tabular-nums">{decade}s</span>,
          value: e.count,
          valueText: formatCount(e.count),
          note: `${formatScore(e.sum / e.count)} ★`
        }))}
      />
      <p className="mt-2 text-[13px] text-ink-2">Bar: number of ratings. After it: their average, in stars. The release year comes from the film’s title.</p>
    </>
  );
}

function ByYearRated() {
  const trends = useQuery('ratings-trends', () => api.getRatingTrends());
  if (trends.status === 'error') return <Failed error={trends.error} subject="rating activity" retry={trends.retry} />;
  if (trends.status !== 'ready') return <LoadingSpinner text="Loading rating activity…" />;
  const byYear = new Map<string, number>();
  for (const t of trends.data) byYear.set(t.yearMonth.slice(0, 4), (byYear.get(t.yearMonth.slice(0, 4)) ?? 0) + t.count);
  const rows = [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b));
  const busiest = rows.reduce((best, row) => (row[1] > best[1] ? row : best), rows[0]);
  return (
    <>
      <BarList
        caption="Number of ratings submitted in each calendar year."
        labelHeader="Year rated"
        valueHeader="Ratings"
        rows={rows.map(([year, count]) => ({
          key: year,
          label: <span className="tabular-nums">{year}</span>,
          value: count,
          valueText: formatCount(count),
          highlight: year === busiest[0]
        }))}
      />
      <p className="mt-2 text-[13px] text-ink-2">
        Bar: ratings submitted that year, from each rating’s timestamp. {rows[0]?.[0]} and {rows[rows.length - 1]?.[0]} are partial years.
      </p>
    </>
  );
}

export default function RatingIntelligencePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ratings"
        description="Why a five-star film with one rating ranks below a film rated a little lower by hundreds of people, and how the adjustment works."
      />

      <section aria-labelledby="why-title" className={PANEL}>
        <h2 id="why-title" className={TITLE}>A handful of ratings or hundreds</h2>
        <p className="mb-4 mt-1 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          A perfect score from one or two people says little about a film; hundreds of ratings averaging just over four say a lot. The adjusted
          score blends each film’s average with the dataset’s average, and trusts the film’s own average more as its ratings add up.
        </p>
        <OneVoteOrHundreds />
      </section>

      <section aria-labelledby="formula-title" className={PANEL}>
        <h2 id="formula-title" className={TITLE}>The formula, as implemented</h2>
        <div className="mt-3">
          <Formula />
        </div>
      </section>

      <BayesPullChart />

      <section aria-labelledby="gems-title" className={PANEL}>
        <h2 id="gems-title" className={TITLE}>Well rated, rarely seen</h2>
        <p className="mb-4 mt-1 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          Films with a high average from a modest number of ratings. Set the limits, then show the films. The API computes the
          list over every film in the stored snapshot.
        </p>
        <HiddenGems />
      </section>

      <section aria-labelledby="time-title" className={PANEL}>
        <h2 id="time-title" className={TITLE}>Ratings over time</h2>
        <p className="mb-5 mt-1 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          Two different clocks: when a film was released, and when someone rated it.
        </p>
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="By the film’s release decade">
            <ByDecade />
          </Block>
          <Block title="By the year the rating was given">
            <ByYearRated />
          </Block>
        </div>
      </section>
    </div>
  );
}
