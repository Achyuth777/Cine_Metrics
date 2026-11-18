import clsx from 'clsx';
import { formatScore } from '../../lib/format';

const SCALE_MIN = 0.5;
const SCALE_MAX = 5;

const position = (value: number) =>
  `${(Math.min(SCALE_MAX, Math.max(SCALE_MIN, value)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN) * 100}%`;

type ScoreScaleProps = {
  /** The film's plain average rating. */
  average: number | null;
  /** The Bayesian-adjusted score. */
  adjusted: number | null;
  /** The dataset's mean rating, drawn as a tick when known. */
  mean?: number;
  /** Print the ends of the scale under the track. */
  showEnds?: boolean;
  className?: string;
};

/**
 * Where a film's average rating and its adjusted score sit on the 0.5 to 5 star
 * scale. The open ring is the average, the amber dot is the adjusted score, and
 * the band between them is how far the adjustment moved it. Read as an image
 * with a text label; the same numbers always appear as text next to it.
 */
export default function ScoreScale({ average, adjusted, mean, showEnds = false, className }: ScoreScaleProps) {
  if (average === null || adjusted === null) return null;

  const label =
    `Average rating ${formatScore(average)}, adjusted score ${formatScore(adjusted)}` +
    (mean !== undefined ? `, dataset average ${formatScore(mean)}` : '') +
    `, on a scale from ${SCALE_MIN} to ${SCALE_MAX} stars.`;
  const low = Math.min(average, adjusted);
  const high = Math.max(average, adjusted);

  return (
    <div className={clsx('select-none', className)} role="img" aria-label={label}>
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-2" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 bg-accent/45"
          style={{ left: position(low), right: `calc(100% - ${position(high)})` }}
        />
        {mean !== undefined && (
          <div className="absolute top-0 h-4 w-px -translate-x-1/2 bg-ink-2" style={{ left: position(mean) }} />
        )}
        {/* The ring is larger than the dot, so both stay visible when the two values almost coincide. */}
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-canvas"
          style={{ left: position(average) }}
        />
        <div
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: position(adjusted) }}
        />
      </div>
      {showEnds && (
        <div className="mt-1 flex justify-between text-xs text-ink-2 tabular-nums" aria-hidden="true">
          <span>{SCALE_MIN}</span>
          <span>{SCALE_MAX} stars</span>
        </div>
      )}
    </div>
  );
}

/** The key that explains the marks on a ScoreScale. Place one wherever scales are shown. */
export function ScoreScaleKey({ showMean = false, className }: { showMean?: boolean; className?: string }) {
  return (
    <ul className={clsx('flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2', className)}>
      <li className="flex items-center gap-2">
        <span className="size-3.5 rounded-full border-2 border-ink bg-canvas" aria-hidden="true" />
        Average rating
      </li>
      <li className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
        Adjusted score
      </li>
      {showMean && (
        <li className="flex items-center gap-2">
          <span className="h-4 w-px bg-ink-2" aria-hidden="true" />
          Dataset average
        </li>
      )}
    </ul>
  );
}
