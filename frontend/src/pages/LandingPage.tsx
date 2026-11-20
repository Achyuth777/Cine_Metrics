import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Star } from 'lucide-react';
import RatingsConstellation from '../components/constellation/RatingsConstellation';
import FilmPoster from '../components/poster/FilmPoster';
import { buttonClass } from '../components/system/buttonClass';
import Metric from '../components/system/Metric';
import ScoreScale, { ScoreScaleKey } from '../components/system/ScoreScale';
import SourceNote from '../components/system/SourceNote';
import type { LandingFilm } from '../demo/landingDemo';
import { useLandingData, type LandingData } from '../hooks/useLandingData';
import { formatCount, formatScore, genreText, titleWithoutYear } from '../lib/format';

const FRAME = 'mx-auto w-full max-w-[1240px] px-5 sm:px-8';
const SECTION = 'py-16 sm:py-20 lg:py-28';
const SECTION_TITLE = 'font-display text-[2rem] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[2.5rem] lg:text-5xl';
const TEXT_LINK = 'inline-flex items-center gap-1.5 rounded-sm font-semibold text-accent underline-offset-4 hover:underline';

const CAPABILITIES = [
  {
    title: 'Discover films',
    body: 'Search every title, filter by genre, year and rating, then switch between a table for comparing and a grid for browsing.',
    to: '/movies',
    link: 'Open the Explorer'
  },
  {
    title: 'Understand ratings',
    body: 'See how ratings are spread, how they shift with a film’s release year, and which well-rated films few people have seen.',
    to: '/ratings',
    link: 'Open rating insights'
  },
  {
    title: 'Inspect the computation',
    body: 'Read the output files each job wrote, check where the snapshot came from, and see whether a Hadoop cluster is connected.',
    to: '/hadoop',
    link: 'Open the Hadoop monitor'
  }
];

const PIPELINE = [
  { title: 'Source data', body: 'Two MovieLens files: every rating, and every film with its genres.' },
  { title: 'HDFS', body: 'The files are copied into Hadoop’s distributed file system.' },
  { title: 'MapReduce', body: 'Seven Java jobs compute averages, counts, distributions, and genre, year and monthly summaries.' },
  { title: 'Reducer output', body: 'Each job writes its result as plain tab-separated files.' },
  { title: 'API and interface', body: 'A small API loads those files, adds the adjusted score, and serves this app.' }
];

/** One film: its generated poster beside the three numbers the poster is drawn from. */
function FilmSignal({ film, mean }: { film: LandingFilm; mean: number }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-7">
      <FilmPoster
        film={{
          movieId: film.movieId,
          title: film.title,
          year: film.year,
          genres: film.genres.split('|').filter(Boolean),
          avgRating: film.avgRating,
          ratingCount: film.ratingCount,
          adjusted: film.weightedRating
        }}
        className="sm:row-span-3"
      />
      <div className="min-w-0 self-center sm:self-start">
        <p className="text-lg font-semibold leading-snug text-ink">{titleWithoutYear(film.title)}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {film.year ?? 'Year unknown'} · {genreText(film.genres)}
        </p>
      </div>
      <dl className="col-span-2 grid grid-cols-3 gap-4 sm:col-span-1 sm:col-start-2">
        <Metric size="lg" label="Average rating" value={formatScore(film.avgRating)} />
        <Metric size="lg" label={film.ratingCount === 1 ? 'Rating' : 'Ratings'} value={formatCount(film.ratingCount)} />
        <Metric size="lg" label="Adjusted score" value={formatScore(film.weightedRating)} accent />
      </dl>
      <ScoreScale
        className="col-span-2 sm:col-span-1 sm:col-start-2"
        average={film.avgRating}
        adjusted={film.weightedRating}
        mean={mean}
      />
    </div>
  );
}

/** The hero's composition: two real films whose star averages mean very different things. */
function SignalFigure({ data }: { data: LandingData }) {
  const leader = data.topAdjusted[0];
  const few = data.fewRatings;
  const mean = data.figures.globalAverageRating;
  if (!leader) return null;

  return (
    <figure className="lit-panel rounded-panel bg-surface-1 p-6 sm:p-8">
      {few && (
        <>
          <FilmSignal film={few} mean={mean} />
          <div className="my-6 border-t border-line" />
        </>
      )}
      <FilmSignal film={leader} mean={mean} />
      <ScoreScaleKey showMean className="mt-6" />
      <figcaption className="mt-5 border-t border-line pt-5">
        <p className="text-[15px] leading-relaxed text-ink-2">
          {few && (
            <>
              A {formatScore(few.avgRating)} average from {formatCount(few.ratingCount)}{' '}
              {few.ratingCount === 1 ? 'rating' : 'ratings'} settles at {formatScore(few.weightedRating)}, close to the
              dataset average of {formatScore(mean)}.{' '}
            </>
          )}
          A {formatScore(leader.avgRating)} average from {formatCount(leader.ratingCount)} ratings barely moves:{' '}
          {formatScore(leader.weightedRating)}.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Each poster is drawn from the same numbers: a speck of light for every rating, a disc at the height of the
          average, and an amber line at the adjusted score.
        </p>
        <SourceNote source={data.source} recordedOn={data.recordedOn} className="mt-3" />
      </figcaption>
    </figure>
  );
}

/** Holds the space of a data panel while the first request is in flight. */
function PanelPlaceholder({ className }: { className: string }) {
  return (
    <div role="status" className={`flex items-center justify-center rounded-panel bg-surface-1 text-sm text-ink-2 ${className}`}>
      Loading films…
    </div>
  );
}

export default function LandingPage() {
  const landing = useLandingData();
  const data = landing.status === 'ready' ? landing.data : null;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>

      <header className={`${FRAME} flex h-16 items-center justify-between gap-6`}>
        <Link to="/" className="flex items-center gap-2.5 rounded-control" translate="no">
          <span className="flex size-8 items-center justify-center rounded-control bg-accent" aria-hidden="true">
            <Star className="size-4 fill-on-accent text-on-accent" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">CineMetrics</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-6">
          <Link
            to="/movies"
            className="hidden rounded-sm text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink sm:inline"
          >
            Explore
          </Link>
          <a
            href="#how-it-works"
            className="hidden rounded-sm text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink sm:inline"
          >
            How it works
          </a>
          <Link to="/overview" className={buttonClass({ variant: 'primary' })}>
            Open studio
          </Link>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="lit-hero">
          <div className={`${FRAME} grid grid-cols-1 items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-20`}>
            <div className="min-w-0 lg:col-span-6">
              <h1
                id="hero-title"
                className="font-display text-[clamp(2.25rem,10.5vw,3.75rem)] leading-[1.04] tracking-[-0.015em] text-ink sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
              >
                <span className="block">Great films.</span>
                <span className="block">Clearer signals.</span>
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-2 sm:text-xl">
                Explore movie ratings, compare audience opinions, and discover how the numbers change when every vote
                gets context.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/movies" className={buttonClass({ variant: 'primary', size: 'lg' })}>
                  Explore movies
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                  See how it works
                </a>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-6">
              <RatingsConstellation />
            </div>
          </div>
        </section>

        {/* Dataset figures */}
        <section aria-labelledby="dataset-title" className="border-y border-line">
          <div className={`${FRAME} py-10`}>
            <h2 id="dataset-title" className="sr-only">
              The dataset in figures
            </h2>
            {data ? (
              <>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                  <Metric size="lg" label="Ratings" value={formatCount(data.figures.totalRatings)} />
                  <Metric size="lg" label="Films" value={formatCount(data.figures.totalMovies)} />
                  <Metric size="lg" label="People who rated" value={formatCount(data.figures.uniqueUsers)} />
                  <Metric
                    size="lg"
                    label="Average rating, out of 5"
                    value={formatScore(data.figures.globalAverageRating)}
                  />
                  <Metric size="lg" label="Genres" value={formatCount(data.figures.genreCount)} />
                </dl>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
                  <p>MovieLens latest-small, from GroupLens Research.</p>
                  <SourceNote source={data.source} recordedOn={data.recordedOn} />
                </div>
              </>
            ) : (
              <p role="status" className="py-6 text-sm text-ink-2">
                Loading dataset figures…
              </p>
            )}
          </div>
        </section>

        {/* Product preview */}
        <section aria-labelledby="preview-title" className={`${FRAME} ${SECTION}`}>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-5">
              <h2 id="preview-title" className={SECTION_TITLE}>
                Three numbers, <span className="sm:block">read together</span>
              </h2>
              <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-ink-2">
                A star average on its own can mislead. CineMetrics shows it beside how many people voted, and a score
                that weighs both.
              </p>
              <dl className="mt-8 space-y-5">
                <div>
                  <dt className="font-semibold text-ink">Average rating</dt>
                  <dd className="mt-1 max-w-[46ch] text-ink-2">
                    The mean of every star rating a film received, from 0.5 to 5.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Rating count</dt>
                  <dd className="mt-1 max-w-[46ch] text-ink-2">How many ratings that average rests on.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-accent">Adjusted score</dt>
                  <dd className="mt-1 max-w-[46ch] text-ink-2">
                    The average, pulled toward the dataset’s overall average when a film has few ratings. With many
                    ratings it stays close to the film’s own average.
                  </dd>
                </div>
              </dl>
            </div>
            <div className="min-w-0 lg:col-span-7">
              {data ? <SignalFigure data={data} /> : <PanelPlaceholder className="h-[30rem]" />}
              <Link to="/movies" className={`${TEXT_LINK} mt-5`}>
                See every film in the Explorer
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section aria-labelledby="capabilities-title" className="lit-section border-t border-line">
          <div className={`${FRAME} ${SECTION}`}>
            <h2 id="capabilities-title" className={SECTION_TITLE}>
              What you can do here
            </h2>
            <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {CAPABILITIES.map((item) => (
                <li key={item.to} className="border-t-2 border-line-strong pt-6">
                  <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
                  <p className="mt-3 max-w-[40ch] leading-relaxed text-ink-2">{item.body}</p>
                  <Link to={item.to} className={`${TEXT_LINK} mt-5`}>
                    {item.link}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pipeline */}
        <section id="how-it-works" aria-labelledby="pipeline-title" className="lit-section scroll-mt-6 border-t border-line">
          <div className={`${FRAME} ${SECTION}`}>
            <h2 id="pipeline-title" className={SECTION_TITLE}>
              How the numbers are made
            </h2>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-2">
              The pipeline is written for Apache Hadoop MapReduce, a system built to split large jobs across many
              machines. The steps, in order:
            </p>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {PIPELINE.map((step, index) => (
                <li key={step.title} className="border-t-2 border-line-strong pt-5">
                  <p className="text-sm font-semibold text-ink-2 tabular-nums">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-12 max-w-[70ch] leading-relaxed text-ink-2">
              This copy of the app reads a saved snapshot of those output files. The Hadoop page shows which engine
              produced the snapshot and whether a cluster is connected right now.
            </p>
            <Link to="/architecture" className={`${TEXT_LINK} mt-4`}>
              Read the architecture and viva notes
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${FRAME} flex flex-col gap-6 py-10 text-sm text-ink-2 md:flex-row md:items-end md:justify-between`}>
          <div className="space-y-1">
            <p>
              <span className="font-semibold text-ink" translate="no">
                CineMetrics
              </span>{' '}
              — Movie ratings analysis using Apache Hadoop MapReduce.
            </p>
            <p>A Big Data Essentials (21CSC314P) project by Achyuth PV, SRM IST Ramapuram.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <li>
                <Link to="/architecture" className="rounded-sm text-ink underline-offset-4 hover:underline">
                  Architecture and viva notes
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Achyuth777/Cine_Metrics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm text-ink underline-offset-4 hover:underline"
                >
                  GitHub repository
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
