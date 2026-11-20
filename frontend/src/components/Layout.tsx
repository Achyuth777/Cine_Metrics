import { useEffect, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { RefreshCw, Star } from 'lucide-react';
import { api } from '../api';
import { apiStatus, type ApiConnectivity } from '../apiStatus';
import { useQuery } from '../hooks/useQuery';
import { formatCount, formatDateTime } from '../lib/format';
import { buttonClass } from './system/buttonClass';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview' },
  { to: '/movies', label: 'Movies' },
  { to: '/genres', label: 'Genres' },
  { to: '/ratings', label: 'Ratings' },
  { to: '/hadoop', label: 'Hadoop' },
  { to: '/architecture', label: 'Architecture' }
];

const FRAME = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8';
const HEALTH_CHECK_MS = 30_000;

/** The engine name as the API reports it, in plain words. Unknown values are shown as they are. */
const ENGINE_LABELS: Record<string, string> = {
  hadoop: 'a Hadoop MapReduce run',
  'python-reference': 'the Python reference pipeline'
};
const engineLabel = (engine: string) => ENGINE_LABELS[engine] ?? engine;

const STATUS_COPY: Record<ApiConnectivity['state'], { label: string; dot: string }> = {
  unknown: { label: 'Checking API…', dot: 'border border-ink-2' },
  connected: { label: 'API connected', dot: 'bg-ok' },
  unreachable: { label: 'API unreachable', dot: 'bg-danger' },
  error: { label: 'API error', dot: 'bg-danger' }
};

/**
 * Backend connectivity, taken from the outcome of real requests. It reads
 * "connected" only after a request has succeeded, and offers a retry when one has not.
 */
function ApiIndicator({ onRetry }: { onRetry: () => void }) {
  const status = useSyncExternalStore(apiStatus.subscribe, apiStatus.get);
  const copy = STATUS_COPY[status.state];
  const failed = status.state === 'unreachable' || status.state === 'error';
  const checkedAt = 'at' in status ? `Last checked ${new Date(status.at).toLocaleTimeString()}` : undefined;

  return (
    <div className="flex items-center gap-2">
      <p
        role="status"
        className="flex items-center gap-2 text-[13px] text-ink-2"
        title={'detail' in status ? `${status.detail}. ${checkedAt}` : checkedAt}
      >
        <span className={clsx('size-2 shrink-0 rounded-full', copy.dot)} aria-hidden="true" />
        <span className={failed ? 'font-medium text-danger' : undefined}>{copy.label}</span>
      </p>
      {failed && (
        <button type="button" onClick={onRetry} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

/** The shell around every studio route: compact navigation, API status, and the dataset's provenance. */
export default function Layout() {
  // One request tells the shell where the data came from. Its outcome also feeds the API indicator.
  const overview = useQuery('shell-overview', () => api.getOverview());

  // Keep the indicator true while the page sits open: re-check when the tab is visible.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') api.getDatasetInfo().catch(() => undefined);
    };
    const timer = window.setInterval(check, HEALTH_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>

      <header className="border-b border-line">
        <div className={`${FRAME} flex flex-wrap items-center gap-x-8 md:flex-nowrap`}>
          <Link to="/" className="flex h-14 shrink-0 items-center gap-2.5 rounded-control" translate="no">
            <span className="flex size-7 items-center justify-center rounded-control bg-accent" aria-hidden="true">
              <Star className="size-4 fill-on-accent text-on-accent" />
            </span>
            <span className="text-base font-semibold tracking-tight text-ink">CineMetrics</span>
          </Link>

          {/* One nav for every width. On phones it becomes its own row and scrolls sideways inside itself. */}
          <nav
            aria-label="Studio"
            className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-line px-4 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:order-none md:mx-0 md:w-auto md:min-w-0 md:border-t-0 md:px-0"
          >
            <ul className="flex h-11 items-stretch gap-1 md:h-14">
              {NAV_ITEMS.map((item) => (
                <li key={item.to} className="flex">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors duration-150',
                        isActive
                          ? 'border-accent font-semibold text-ink'
                          : 'border-transparent text-ink-2 hover:text-ink'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex h-14 items-center">
            <ApiIndicator onRetry={overview.retry} />
          </div>
        </div>
      </header>

      <main id="main" className={`${FRAME} lit-section flex-1 py-6 lg:py-8`}>
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className={`${FRAME} flex flex-col gap-3 py-5 text-[13px] text-ink-2 lg:flex-row lg:items-center lg:justify-between`}>
          {overview.status === 'ready' ? (
            <dl className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <dt className="inline">Dataset: </dt>
                <dd className="inline text-ink">
                  {overview.data.datasetInfo.name}, {formatCount(overview.data.totalRatings)} ratings
                </dd>
              </div>
              <div>
                <dt className="inline">Snapshot computed by: </dt>
                <dd className="inline text-ink">{engineLabel(overview.data.engine)}</dd>
              </div>
              {overview.data.apiLoadedAt && (
                <div>
                  <dt className="inline">Loaded into the API: </dt>
                  <dd className="inline text-ink">{formatDateTime(overview.data.apiLoadedAt)}</dd>
                </div>
              )}
              <div>
                <Link to="/hadoop" className="text-accent underline-offset-4 hover:underline">
                  Provenance details
                </Link>
              </div>
            </dl>
          ) : (
            <p>
              {overview.status === 'error'
                ? 'Dataset details are unavailable while the API can’t be reached.'
                : 'Reading dataset details…'}
            </p>
          )}
          <p className="lg:shrink-0 lg:text-right">Achyuth PV · SRM IST Ramapuram · Big Data Essentials (21CSC314P)</p>
        </div>
      </footer>
    </div>
  );
}
