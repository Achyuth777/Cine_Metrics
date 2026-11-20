import type { ReactNode } from 'react';
import clsx from 'clsx';

type MetricProps = {
  label: ReactNode;
  value: ReactNode;
  /** A short clarification under the label. */
  note?: ReactNode;
  /** lg for a page’s headline figures, md inside panels and cards, sm under a poster. */
  size?: 'sm' | 'md' | 'lg';
  /** Amber marks the adjusted score; leave everything else in ink. */
  accent?: boolean;
  className?: string;
};

/**
 * One labelled figure, set in tabular numerals. Renders a <dt>/<dd> pair, so
 * place Metrics inside a <dl>. Figures sit in a row or grid, not in separate cards.
 */
export default function Metric({ label, value, note, size = 'md', accent = false, className }: MetricProps) {
  return (
    <div className={clsx('flex flex-col-reverse justify-end gap-1', className)}>
      <dt className={clsx('leading-snug text-ink-2', size === 'sm' ? 'text-xs' : 'text-[13px]')}>
        {label}
        {note && <span className="block text-xs">{note}</span>}
      </dt>
      <dd
        className={clsx(
          'font-semibold leading-none tracking-tight tabular-nums',
          size === 'lg' ? 'text-[1.75rem] sm:text-3xl' : size === 'sm' ? 'text-[17px]' : 'text-xl',
          accent ? 'text-accent' : 'text-ink'
        )}
      >
        {value}
      </dd>
    </div>
  );
}
