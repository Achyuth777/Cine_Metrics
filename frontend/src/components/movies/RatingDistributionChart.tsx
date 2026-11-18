import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCount } from '../../lib/format';

type RatingDistributionChartProps = {
  /** Ratings per star value, as the API returns it: { "0.5": 0, ..., "5.0": 153 }. */
  distribution: Record<string, number> | null | undefined;
  /** Names the data for screen readers, for example "Ratings by star value for Heat". */
  caption: string;
  height?: number;
};

const AXIS_TICK = { fill: 'var(--cm-text-secondary)', fontSize: 12 };

/**
 * How many ratings a film received at each star value. The bars are a picture
 * for sighted readers; the same numbers follow as a table for everyone else.
 */
export default function RatingDistributionChart({ distribution, caption, height = 176 }: RatingDistributionChartProps) {
  const rows = Object.entries(distribution ?? {})
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => Number(a.rating) - Number(b.rating));

  if (rows.every((row) => row.count === 0)) {
    return <p className="text-sm text-ink-2">No rating breakdown is recorded for this film.</p>;
  }

  return (
    <div className="relative">
      <div aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="rating" stroke="var(--cm-control-border)" tick={AXIS_TICK} tickLine={false} />
            <YAxis allowDecimals={false} stroke="var(--cm-control-border)" tick={AXIS_TICK} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--cm-text-primary) 6%, transparent)' }}
              contentStyle={{
                backgroundColor: 'var(--cm-surface-2)',
                border: '1px solid var(--cm-control-border)',
                borderRadius: 8,
                color: 'var(--cm-text-primary)',
                fontSize: 13
              }}
              itemStyle={{ color: 'var(--cm-text-primary)' }}
              labelFormatter={(label) => `${label} stars`}
              formatter={(value) => [formatCount(Number(value)), 'Ratings']}
            />
            <Bar dataKey="count" fill="var(--cm-text-secondary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-xs text-ink-2" aria-hidden="true">
        Stars given (bars show the number of ratings)
      </p>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Stars</th>
            <th scope="col">Ratings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rating}>
              <th scope="row">{row.rating}</th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
