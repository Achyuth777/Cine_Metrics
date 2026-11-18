import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BarListRow = {
  key: string;
  /** The row's name, shown at the start of the row. Can hold a link. */
  label: ReactNode;
  value: number;
  /** The value as text, with its unit. Shown at the end of the bar. */
  valueText: string;
  /** Extra text after the value, such as a share. */
  note?: string;
  /** Draw this bar in amber instead of the neutral tone. */
  highlight?: boolean;
};

type BarListProps = {
  /** What the list shows, with units. Becomes the table caption. */
  caption: string;
  labelHeader: string;
  valueHeader: string;
  rows: BarListRow[];
  /** The value at the full width of a bar. Defaults to the largest value. */
  max?: number;
  /** The value at zero width, for scales that do not start at 0 (e.g. ratings from 0.5). */
  min?: number;
  className?: string;
};

/**
 * A horizontal bar chart drawn as a real table: each row is a label, a bar and
 * its value in text. Screen readers read it as a table, so it needs no separate
 * text alternative, and it never needs a chart library.
 */
export default function BarList({ caption, labelHeader, valueHeader, rows, max, min = 0, className }: BarListProps) {
  const top = max ?? Math.max(...rows.map((row) => row.value), 0);
  const share = (value: number) => (top > min ? Math.max(0, Math.min(1, (value - min) / (top - min))) : 0);
  return (
    <table className={clsx('w-full border-separate border-spacing-y-1.5 text-sm', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{labelHeader}</th>
          <th scope="col">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="w-[1%] whitespace-nowrap pr-4 text-left font-normal text-ink-2">
              {row.label}
            </th>
            <td className="relative">
              <div className="flex items-center gap-3">
                <div className="h-5 min-w-0 flex-1" aria-hidden="true">
                  <div
                    className={clsx('h-full rounded-r-sm', row.highlight ? 'bg-accent' : 'bg-ink-2/45')}
                    style={{ width: `${(share(row.value) * 100).toFixed(2)}%` }}
                  />
                </div>
                <span className="w-[9.5rem] shrink-0 text-right text-ink">
                  {row.valueText}
                  {row.note && <span className="ml-1.5 text-ink-2">{row.note}</span>}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
