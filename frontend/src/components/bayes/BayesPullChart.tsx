import { Component, Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { List, RotateCcw, ScatterChart } from 'lucide-react';
import { useBayesPullData } from '../../hooks/useBayesPullData';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { PRIOR_WEIGHT, buildPull, type PullFilm, type PullModel } from '../../lib/bayesPull';
import { CHART_ASPECT } from '../../lib/constellation';
import { explorerSearchPath } from '../../lib/explorerParams';
import { describeError, formatCount, formatScore, titleWithoutYear } from '../../lib/format';
import { ErrorState } from '../LoadingState';
import { buttonClass } from '../system/buttonClass';
import BayesPullSvg from './BayesPullSvg';
import { describePull } from './PullTooltip';

const BayesPullScene = lazy(() => import('./BayesPullScene'));
const PHONE_POINTS = 150;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** An even spread of films for phones: every n-th by rating count, so few- and many-rated films both stay. */
const thin = (films: PullFilm[], limit: number) => {
  if (films.length <= limit) return films;
  const sorted = [...films].sort((a, b) => b.ratingCount - a.ratingCount);
  return Array.from({ length: limit }, (_, i) => sorted[Math.floor((i * sorted.length) / limit)]);
};

function PullTable({ model }: { model: PullModel }) {
  return (
    <div className="absolute inset-0 overflow-auto bg-surface-1" role="region" aria-label="Films on the surface, scrollable table" tabIndex={0}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">The {model.points.length} films placed on the surface, most rated first.</caption>
        <thead className="sticky top-0 bg-surface-1 text-[13px] text-ink-2 shadow-[0_1px_0_var(--cm-control-border)]">
          <tr>
            <th scope="col" className="py-2.5 pl-5 pr-2 font-medium">Film</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Ratings</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Average rating</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Adjusted score (API)</th>
            {model.simulated && <th scope="col" className="px-2 py-2.5 text-right font-medium">Simulated, m = {model.m}</th>}
            <th scope="col" className="py-2.5 pl-2 pr-5 text-right font-medium">Change from average</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {model.points.map((point) => (
            <tr key={point.movieId}>
              <th scope="row" className="py-2 pl-5 pr-2 font-medium">
                <Link to={explorerSearchPath(point.title)} className="rounded-sm text-ink underline-offset-4 hover:text-accent hover:underline">
                  {titleWithoutYear(point.title)}
                </Link>
                <span className="ml-2 font-normal text-ink-2">{point.year}</span>
              </th>
              <td className="px-2 py-2 text-right text-ink">{formatCount(point.ratingCount)}</td>
              <td className="px-2 py-2 text-right text-ink">{formatScore(point.avgRating)}</td>
              <td className="px-2 py-2 text-right font-semibold text-accent">{formatScore(point.adjusted)}</td>
              {model.simulated && <td className="px-2 py-2 text-right text-ink">{formatScore(point.score)}</td>}
              <td className="py-2 pl-2 pr-5 text-right text-ink-2">{(point.score - point.avgRating >= 0 ? '+' : '−') + formatScore(Math.abs(point.score - point.avgRating))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Bayesian pull": the adjusted-score formula as a surface over rating count and
 * average rating, with real films placed on it. 3D where WebGL is available and
 * the screen is 768px or wider; the same picture as a static SVG elsewhere; and
 * always available as a table.
 */
export default function BayesPullChart() {
  const navigate = useNavigate();
  const data = useBayesPullData();
  const phone = useMediaQuery('(max-width: 767px)');
  const [webgl] = useState(detectWebGL);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [m, setM] = useState(PRIOR_WEIGHT);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null!);
  const width = useElementWidth(chartRef);
  const titleId = useId();
  const helpId = useId();
  const sliderId = useId();

  const ready = data.status === 'ready' ? data.data : null;
  const model = useMemo(
    () => (ready ? buildPull(phone ? thin(ready.films, PHONE_POINTS) : ready.films, ready.mean, m, phone) : null),
    [ready, phone, m]
  );
  const use3d = webgl && !phone && !sceneFailed && view === 'chart' && model !== null;
  const showScene = use3d && sceneReady;
  const height = Math.round(width / CHART_ASPECT);
  const active = model && activeIndex !== null ? model.points[activeIndex] : null;
  const label = model
    ? `Bayesian pull surface: the adjusted score for every rating count and average rating, with prior weight ${model.m} and dataset mean ${formatScore(model.mean)}, and ${model.points.length} films placed on it.`
    : 'Bayesian pull surface';

  const open = (index: number) => {
    if (model?.points[index]) navigate(explorerSearchPath(model.points[index].title));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!model) return;
    const last = model.points.length - 1;
    const step = (next: (current: number | null) => number) => {
      event.preventDefault();
      setActiveIndex((current) => Math.min(last, Math.max(0, next(current))));
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step((c) => (c ?? -1) + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step((c) => (c ?? 1) - 1);
    else if (event.key === 'Home') step(() => 0);
    else if (event.key === 'End') step(() => last);
    else if (event.key === 'Escape') setActiveIndex(null);
    else if ((event.key === 'Enter' || event.key === ' ') && activeIndex !== null) {
      event.preventDefault();
      open(activeIndex);
    }
  };

  if (data.status === 'error') {
    const failure = describeError(data.error, 'the Bayesian pull chart');
    return <ErrorState title={failure.title} message={failure.message} onRetry={data.retry} />;
  }

  return (
    <figure aria-labelledby={titleId} className="lit-panel overflow-hidden rounded-panel bg-surface-1">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-4 pt-5 sm:px-6">
        <div className="max-w-[62ch]">
          <h2 id={titleId} className="font-display text-2xl text-ink">
            Bayesian pull
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            The surface is the adjusted score for every mix of rating count and average rating. Dots are real films; the
            line from each runs to the height of its plain average. Films with few ratings sit far from their average;
            films with many barely move.
          </p>
          <p className="mt-2 inline-flex rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-ink">
            Computed from the stored snapshot
          </p>
        </div>
        <button
          type="button"
          disabled={!model}
          onClick={() => {
            setActiveIndex(null);
            setView((v) => (v === 'chart' ? 'table' : 'chart'));
          }}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          {view === 'chart' ? <List className="size-3.5" aria-hidden="true" /> : <ScatterChart className="size-3.5" aria-hidden="true" />}
          {view === 'chart' ? 'View as table' : 'View as chart'}
        </button>
      </div>

      <div ref={chartRef} className="relative w-full bg-canvas" style={{ aspectRatio: CHART_ASPECT }}>
        {data.status === 'loading' && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-ink-2">
            Loading films…
          </p>
        )}
        {model && view === 'table' && <PullTable model={model} />}
        {model && view === 'chart' && width > 0 && (
          <div
            role="group"
            tabIndex={0}
            aria-roledescription="interactive chart"
            aria-label={label}
            aria-describedby={helpId}
            onKeyDown={onKeyDown}
            onFocus={(event) => {
              if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible') && activeIndex === null) setActiveIndex(0);
            }}
            onBlur={() => setActiveIndex(null)}
            className="absolute inset-0 -outline-offset-2"
          >
            {!showScene && (
              <BayesPullSvg model={model} width={width} height={height} activeIndex={activeIndex} onActiveChange={setActiveIndex} onOpen={open} inert={use3d} />
            )}
            {use3d && (
              <div className={showScene ? 'absolute inset-0' : 'absolute inset-0 opacity-0'}>
                <SceneBoundary onError={() => setSceneFailed(true)}>
                  <Suspense fallback={null}>
                    <BayesPullScene
                      model={model}
                      activeIndex={activeIndex}
                      label={label}
                      onActiveChange={setActiveIndex}
                      onOpen={open}
                      onReady={() => setSceneReady(true)}
                      onFailure={() => setSceneFailed(true)}
                      overlay={overlayRef}
                    />
                  </Suspense>
                </SceneBoundary>
                <div ref={overlayRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
              </div>
            )}
          </div>
        )}
      </div>

      <p id={helpId} className="sr-only">
        Use the arrow keys to move between films and Enter to open one in the Explorer. “View as table” lists the same films.
      </p>
      <p className="sr-only" aria-live="polite">
        {active && model ? describePull(active, model.simulated) : ''}
      </p>

      <div className="space-y-4 px-5 py-4 sm:px-6">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Formula, as the API computes it: adjusted = (v ÷ (v + m)) × average + (m ÷ (v + m)) × mean, with v the number of
          ratings, m = {PRIOR_WEIGHT} and mean = {model ? formatScore(model.mean) : '…'}.
          {showScene ? ' Drag to rotate.' : ''} Select a dot to open the film in the Explorer.
        </p>
        <fieldset className="rounded-control border border-line-strong px-4 pb-4 pt-2">
          <legend className="px-1 text-xs font-semibold text-accent">Educational simulation</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label htmlFor={sliderId} className="text-sm text-ink">
              Prior weight m: <span className="font-semibold tabular-nums">{m}</span>
            </label>
            <input
              id={sliderId}
              type="range"
              min={1}
              max={100}
              step={1}
              value={m}
              disabled={!model}
              onChange={(event) => setM(Number(event.target.value))}
              className="w-full max-w-xs accent-[var(--cm-accent)]"
            />
            <button
              type="button"
              onClick={() => setM(PRIOR_WEIGHT)}
              disabled={m === PRIOR_WEIGHT}
              className={buttonClass({ variant: 'quiet', size: 'sm' })}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Back to m = {PRIOR_WEIGHT}
            </button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2" aria-live="polite">
            {m === PRIOR_WEIGHT
              ? `At m = ${PRIOR_WEIGHT} the dots show the adjusted scores the API returned. Move the slider to see how a stronger or weaker prior would change them.`
              : `Simulated in this chart only, with m = ${m}. The adjusted scores everywhere else in CineMetrics still use m = ${PRIOR_WEIGHT}.`}
          </p>
        </fieldset>
      </div>
    </figure>
  );
}
