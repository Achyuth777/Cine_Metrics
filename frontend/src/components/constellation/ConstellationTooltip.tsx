import type { ConstellationPoint } from '../../lib/constellation';
import { formatCount, formatScore, titleWithoutYear } from '../../lib/format';

/** One sentence that says the same as the tooltip, for screen readers and the live region. */
export function describePoint(point: ConstellationPoint, total: number): string {
  return (
    `${titleWithoutYear(point.title)}${point.year ? `, ${point.year}` : ''}. ` +
    `Average rating ${formatScore(point.avgRating)} from ${formatCount(point.ratingCount)} ratings. ` +
    `Adjusted score ${formatScore(point.adjusted)}, ${formatScore(point.pull)} lower. ` +
    `Film ${point.rank} of ${total}.`
  );
}

/** The card shown for the film under the pointer or the keyboard focus. Both renderers use it. */
export default function ConstellationTooltip({ point }: { point: ConstellationPoint }) {
  return (
    <div className="pointer-events-none w-60 rounded-control border border-line-strong bg-surface-2 p-3 text-left shadow-xl shadow-black/60">
      <p className="text-sm font-semibold leading-snug text-ink">{titleWithoutYear(point.title)}</p>
      <p className="mt-0.5 text-xs text-ink-2 tabular-nums">
        {point.year ?? 'Year unknown'} · ranked {point.rank}
      </p>
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
          <dt className="text-[11px] leading-tight text-ink-2">Adjusted</dt>
          <dd className="text-sm font-semibold text-accent tabular-nums">{formatScore(point.adjusted)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-2 tabular-nums">
        Pulled {formatScore(point.pull)} toward the mean. Click to open it in the Explorer.
      </p>
    </div>
  );
}
