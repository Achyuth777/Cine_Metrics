import type { PullPoint } from '../../lib/bayesPull';
import { formatCount, formatScore, titleWithoutYear } from '../../lib/format';

const pullText = (point: PullPoint) =>
  Math.abs(point.pull) < 0.005
    ? 'barely moved'
    : point.pull > 0
      ? `pulled down ${formatScore(point.pull)}`
      : `pulled up ${formatScore(-point.pull)}`;

/** One sentence that says the same as the tooltip, for the live region. */
export function describePull(point: PullPoint, simulated: boolean): string {
  return (
    `${titleWithoutYear(point.title)}${point.year ? `, ${point.year}` : ''}. ` +
    `Average ${formatScore(point.avgRating)} from ${formatCount(point.ratingCount)} ratings. ` +
    `${simulated ? 'Simulated adjusted score' : 'Adjusted score'} ${formatScore(point.score)}, ${pullText(point)}.`
  );
}

export default function PullTooltip({ point, simulated }: { point: PullPoint; simulated: boolean }) {
  return (
    <div className="pointer-events-none w-60 rounded-control border border-line-strong bg-surface-2 p-3 text-left shadow-xl shadow-black/60">
      <p className="text-sm font-semibold leading-snug text-ink">{titleWithoutYear(point.title)}</p>
      <p className="mt-0.5 text-xs text-ink-2 tabular-nums">{point.year ?? 'Year unknown'}</p>
      <dl className="mt-2.5 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[11px] leading-tight text-ink-2">Average</dt>
          <dd className="text-sm font-semibold text-ink tabular-nums">{formatScore(point.avgRating)}</dd>
        </div>
        <div>
          <dt className="text-[11px] leading-tight text-ink-2">Ratings</dt>
          <dd className="text-sm font-semibold text-ink tabular-nums">{formatCount(point.ratingCount)}</dd>
        </div>
        <div>
          <dt className="text-[11px] leading-tight text-ink-2">{simulated ? 'Simulated' : 'Adjusted'}</dt>
          <dd className="text-sm font-semibold text-accent tabular-nums">{formatScore(point.score)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-2">{pullText(point)[0].toUpperCase() + pullText(point).slice(1)} toward the mean.</p>
    </div>
  );
}
