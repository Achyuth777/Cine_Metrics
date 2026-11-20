import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Pause, Play, ScatterChart } from 'lucide-react';
import { useConstellationData } from '../../hooks/useConstellationData';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { buildConstellation, CHART_ASPECT } from '../../lib/constellation';
import { explorerSearchPath } from '../../lib/explorerParams';
import { formatCount, formatScore } from '../../lib/format';
import { buttonClass } from '../system/buttonClass';
import SourceNote from '../system/SourceNote';
import ConstellationSvg from './ConstellationSvg';
import ConstellationTable from './ConstellationTable';
import { describePoint } from './ConstellationTooltip';

// three.js and the scene load in their own chunk, only where the 3D version is used.
const ConstellationScene = lazy(() => import('./ConstellationScene'));

/** Phones get the SVG still with the top films only. */
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

function useOnScreen(ref: RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

const subscribeToVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};
const usePageVisible = () => useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === 'visible');

/** If the 3D scene throws, the SVG still stays on screen. */
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

/**
 * The hero's chart: the films with the highest adjusted scores, placed by average
 * rating, rating count and adjusted score, with a line showing each film's
 * Bayesian pull. WebGL where it is available and the screen is wide enough; the
 * same picture as a static SVG everywhere else. The data is always available as a table.
 */
export default function RatingsConstellation() {
  const navigate = useNavigate();
  const data = useConstellationData();
  const phone = useMediaQuery('(max-width: 767px)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [webgl] = useState(detectWebGL);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null!);
  const width = useElementWidth(chartRef);
  const onScreen = useOnScreen(chartRef);
  const pageVisible = usePageVisible();
  const titleId = useId();
  const helpId = useId();

  const ready = data.status === 'ready' ? data.data : null;
  const model = useMemo(
    () => (ready ? buildConstellation(phone ? ready.films.slice(0, PHONE_POINTS) : ready.films, ready.mean, phone) : null),
    [ready, phone]
  );

  const use3d = webgl && !phone && !sceneFailed && view === 'chart' && model !== null;
  const showScene = use3d && sceneReady;
  const running = showScene && onScreen && pageVisible && !paused && !reduceMotion;
  const height = Math.round(width / CHART_ASPECT);
  const active = model && activeIndex !== null ? model.points[activeIndex] : null;
  const label = model
    ? `Ratings constellation: ${model.points.length} films placed by average rating, number of ratings and adjusted score.`
    : 'Ratings constellation';

  const open = (index: number) => {
    if (model?.points[index]) navigate(explorerSearchPath(model.points[index].title));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!model) return;
    const last = model.points.length - 1;
    // Steps build on the latest index, so held-down arrow keys never skip or repeat a film.
    const step = (next: (current: number | null) => number) => {
      event.preventDefault();
      setActiveIndex((current) => Math.min(last, Math.max(0, next(current))));
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step((current) => (current ?? -1) + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step((current) => (current ?? 1) - 1);
    else if (event.key === 'Home') step(() => 0);
    else if (event.key === 'End') step(() => last);
    else if (event.key === 'Escape') setActiveIndex(null);
    else if ((event.key === 'Enter' || event.key === ' ') && activeIndex !== null) {
      event.preventDefault();
      open(activeIndex);
    }
  };

  return (
    <figure aria-labelledby={titleId} className="lit-panel overflow-hidden rounded-panel bg-surface-1">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Ratings constellation
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">
            {model ? `The ${formatCount(model.points.length)} films with the highest adjusted scores` : 'Each dot is one film'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showScene && !reduceMotion && (
            <button type="button" onClick={() => setPaused((value) => !value)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
              {paused ? 'Play motion' : 'Pause motion'}
            </button>
          )}
          <button
            type="button"
            disabled={!model}
            onClick={() => {
              setActiveIndex(null);
              setView((current) => (current === 'chart' ? 'table' : 'chart'));
            }}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            {view === 'chart' ? <List className="size-3.5" aria-hidden="true" /> : <ScatterChart className="size-3.5" aria-hidden="true" />}
            {view === 'chart' ? 'View as table' : 'View as chart'}
          </button>
        </div>
      </div>

      <div ref={chartRef} className="relative w-full bg-canvas" style={{ aspectRatio: CHART_ASPECT }}>
        {data.status === 'loading' && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-ink-2">
            Loading films…
          </p>
        )}
        {data.status === 'error' && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-ink">The constellation couldn’t be loaded.</p>
            <button type="button" onClick={data.retry} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              Retry
            </button>
          </div>
        )}

        {model && view === 'table' && <ConstellationTable model={model} />}

        {model && view === 'chart' && width > 0 && (
          <div
            role="group"
            tabIndex={0}
            aria-roledescription="interactive chart"
            aria-label={label}
            aria-describedby={helpId}
            onKeyDown={onKeyDown}
            onFocus={(event) => {
              if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible') && activeIndex === null) {
                setActiveIndex(0);
              }
            }}
            onBlur={() => setActiveIndex(null)}
            className="absolute inset-0 -outline-offset-2"
          >
            {!showScene && (
              <ConstellationSvg
                model={model}
                width={width}
                height={height}
                activeIndex={activeIndex}
                onActiveChange={setActiveIndex}
                onOpen={open}
                inert={use3d}
              />
            )}
            {use3d && (
              <div className={showScene ? 'absolute inset-0' : 'absolute inset-0 opacity-0'}>
                <SceneBoundary onError={() => setSceneFailed(true)}>
                  <Suspense fallback={null}>
                    <ConstellationScene
                      model={model}
                      activeIndex={activeIndex}
                      running={running}
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
        Use the arrow keys to move between films and Enter to open one in the Explorer. “View as table” shows the same
        films as a table.
      </p>
      <p className="sr-only" aria-live="polite">
        {active && model ? describePoint(active, model.points.length) : ''}
      </p>

      <figcaption className="space-y-3 px-5 py-4 sm:px-6">
        {model && (
          <ul className="grid gap-x-6 gap-y-1.5 text-[13px] leading-snug text-ink-2 sm:grid-cols-2">
            <li>
              <span className="font-medium text-ink">Across:</span> average rating, {formatScore(model.domain.average[0], 1)} to 5 stars
            </li>
            <li>
              <span className="font-medium text-ink">Up:</span> adjusted score in stars; the floor is the dataset mean,{' '}
              {formatScore(model.mean)}
            </li>
            <li>
              <span className="font-medium text-ink">Depth and dot size:</span> number of ratings, {formatCount(model.domain.count[0])} to{' '}
              {formatCount(model.domain.count[1])} on a log scale
            </li>
            <li>
              <span className="font-medium text-ink">Line above a dot:</span> how far the adjustment pulled the film down from its average
            </li>
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {ready && <SourceNote source={ready.source} recordedOn={ready.recordedOn} />}
          {model && view === 'chart' && (
            <p className="text-[13px] text-ink-2">
              {showScene ? 'Drag to rotate. ' : ''}Select a dot to open the film in the Explorer.
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
