import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
import { ErrorState, LoadingSpinner } from '../components/LoadingState';
import BarList from '../components/system/BarList';
import Metric from '../components/system/Metric';
import PageHeader from '../components/system/PageHeader';
import ScrollHint from '../components/system/ScrollHint';
import { useQuery } from '../hooks/useQuery';
import { DEFAULT_MIN_COUNT, explorerPath, explorerSearchPath } from '../lib/explorerParams';
import { describeError, formatCount, formatScore, titleWithoutYear } from '../lib/format';

const PANEL = 'lit-panel rounded-panel bg-surface-1 p-5 sm:p-6';
const PANEL_TITLE = 'text-lg font-semibold text-ink';
const TEXT_LINK = 'inline-flex items-center gap-1.5 rounded-sm font-semibold text-accent underline-offset-4 hover:underline';

/** Ready-made Explorer views. Each link opens /movies with these filters set. */
const STARTING_POINTS = [
  {
    title: 'The most rated films',
    body: 'What this audience watched and rated most.',
    to: explorerPath({ sortBy: 'ratingCount' })
  },
  {
    title: 'High averages with real support',
    body: 'Films averaging 4 stars or more from at least 50 ratings.',
    to: explorerPath({ minRating: 4, minCount: 50, sortBy: 'avgRating' })
  },
  {
    title: 'Every film, unfiltered',
    body: 'Including the films with a single rating, where averages swing the most.',
    to: explorerPath({ minCount: 0 })
  },
  {
    title: 'Well rated, rarely seen',
    body: 'Films with a high average from few ratings, and why their scores are adjusted.',
    to: '/ratings'
  }
];

function DatasetFigures() {
  const overview = useQuery('overview', () => api.getOverview());
  if (overview.status === 'error') {
    const failure = describeError(overview.error, 'the dataset figures');
    return <ErrorState title={failure.title} message={failure.message} onRetry={overview.retry} />;
  }
  if (overview.status !== 'ready') return <LoadingSpinner text="Loading the dataset figures…" />;
  const data = overview.data;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
      <Metric size="lg" label="Ratings" note="Each one a person’s 0.5–5 star score for a film" value={formatCount(data.totalRatings)} />
      <Metric size="lg" label="Films" note="In the catalogue; 18 have no ratings" value={formatCount(data.totalMovies)} />
      <Metric size="lg" label="People who rated" note="Each rated at least 20 films" value={formatCount(data.uniqueUsers)} />
      <Metric size="lg" label="Average rating" note="Across every rating, out of 5" value={formatScore(data.globalAverageRating)} />
      <Metric size="lg" label="Genres" note="A film can have several" value={formatCount(data.genreCount)} />
    </dl>
  );
}

function RatingSpread() {
  const spread = useQuery('rating-distribution', () => api.getRatingDistribution());
  if (spread.status === 'error') {
    const failure = describeError(spread.error, 'the rating distribution');
    return <ErrorState title={failure.title} message={failure.message} onRetry={spread.retry} />;
  }
  if (spread.status !== 'ready') return <LoadingSpinner text="Loading the rating distribution…" />;

  const rows = spread.data;
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const mostCommon = rows.reduce((best, row) => (row.count > best.count ? row : best), rows[0]);
  const fourAndUp = rows.filter((row) => Number(row.rating) >= 4).reduce((sum, row) => sum + row.count, 0);
  const halfStars = rows.filter((row) => !Number.isInteger(Number(row.rating))).reduce((sum, row) => sum + row.count, 0);
  const percent = (count: number) => `${((count / total) * 100).toFixed(1)}%`;

  return (
    <>
      <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
        The most common rating is <strong className="font-semibold text-ink">{mostCommon.rating} stars</strong>, and{' '}
        <strong className="font-semibold text-ink">{percent(fourAndUp)}</strong> of all ratings are 4 stars or more.
        Half-star ratings are less common than whole stars: {percent(halfStars)} of the total.
      </p>
      <BarList
        className="mt-5"
        caption={`Number of ratings at each star value, out of ${formatCount(total)} ratings.`}
        labelHeader="Stars"
        valueHeader="Ratings, with share of all ratings"
        rows={rows.map((row) => ({
          key: row.rating,
          label: <span className="tabular-nums">{row.rating} ★</span>,
          value: row.count,
          valueText: formatCount(row.count),
          note: percent(row.count),
          highlight: row.rating === mostCommon.rating
        }))}
      />
      <p className="mt-3 text-[13px] text-ink-2">Bar length: number of ratings given at that star value.</p>
    </>
  );
}

function TopFilms() {
  const top = useQuery('overview-top', (signal) =>
    api.getMovies({ sortBy: 'weightedRating', sortOrder: 'desc', pageSize: 10, minCount: DEFAULT_MIN_COUNT }, signal)
  );
  if (top.status === 'error') {
    const failure = describeError(top.error, 'the top films');
    return <ErrorState title={failure.title} message={failure.message} onRetry={top.retry} />;
  }
  if (top.status !== 'ready') return <LoadingSpinner text="Loading the top films…" />;
  return (
    <div className="relative overflow-x-auto" role="region" aria-label="Top ten films by adjusted score, scrollable" tabIndex={0}>
      <table className="w-full min-w-[24rem] text-left text-sm">
        <caption className="sr-only">The ten films with the highest adjusted score, among films with at least {DEFAULT_MIN_COUNT} ratings.</caption>
        <thead className="text-[13px] text-ink-2">
          <tr className="border-b border-line">
            <th scope="col" className="py-2 pr-3 font-medium">#</th>
            <th scope="col" className="py-2 pr-3 font-medium">Film</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Average</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Ratings</th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">Adjusted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {top.data.movies.map((film, index) => (
            <tr key={film.movieId}>
              <td className="py-2.5 pr-3 text-ink-2">{index + 1}</td>
              <th scope="row" className="py-2.5 pr-3 font-medium">
                <Link to={explorerSearchPath(film.title)} className="rounded-sm text-ink underline-offset-4 hover:text-accent hover:underline">
                  {titleWithoutYear(film.title)}
                </Link>
                <span className="block text-[13px] font-normal text-ink-2">{film.year}</span>
              </th>
              <td className="px-2 py-2.5 text-right text-ink">{formatScore(film.avgRating)}</td>
              <td className="px-2 py-2.5 text-right text-ink">{formatCount(film.ratingCount)}</td>
              <td className="py-2.5 pl-2 text-right font-semibold text-accent">{formatScore(film.weightedRating)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="What is in the MovieLens dataset, and good places to start exploring it."
        actions={
          <Link to="/movies" className={TEXT_LINK}>
            Open the Explorer
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <section aria-labelledby="figures-title">
        <h2 id="figures-title" className="sr-only">
          The dataset in figures
        </h2>
        <DatasetFigures />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section aria-labelledby="spread-title" className={`${PANEL} min-w-0 lg:col-span-6`}>
          <h2 id="spread-title" className={PANEL_TITLE}>
            How people rate
          </h2>
          <div className="mt-2">
            <RatingSpread />
          </div>
        </section>

        <section aria-labelledby="top-title" className={`${PANEL} min-w-0 lg:col-span-6`}>
          <h2 id="top-title" className={PANEL_TITLE}>
            Top 10 by adjusted score
          </h2>
          <p className="mb-3 mt-1 text-[15px] leading-relaxed text-ink-2">
            Films with at least {DEFAULT_MIN_COUNT} ratings. The adjusted score weighs each average by how many people
            rated the film, so a handful of perfect scores cannot top the list.
          </p>
          <ScrollHint className="mb-2">Swipe the table sideways for the adjusted score.</ScrollHint>
          <TopFilms />
          <Link to={explorerPath({})} className={`${TEXT_LINK} mt-4`}>
            See the full ranking
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="start-title">
        <h2 id="start-title" className={PANEL_TITLE}>
          Where to start
        </h2>
        <ul className="mt-4 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {STARTING_POINTS.map((item) => (
            <li key={item.title} className="border-t-2 border-line-strong pt-4">
              <Link to={item.to} className="group rounded-sm">
                <span className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-accent">
                  {item.title}
                  <ArrowRight className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-2">{item.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
