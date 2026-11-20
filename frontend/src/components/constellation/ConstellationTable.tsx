import { Link } from 'react-router-dom';
import type { ConstellationModel } from '../../lib/constellation';
import { explorerSearchPath } from '../../lib/explorerParams';
import { formatCount, formatScore, titleWithoutYear } from '../../lib/format';

/** The constellation's data as a table: every plotted film, with a link into the Explorer. */
export default function ConstellationTable({ model }: { model: ConstellationModel }) {
  return (
    <div
      className="absolute inset-0 overflow-auto bg-surface-1"
      role="region"
      aria-label="Films in the constellation, scrollable table"
      tabIndex={0}
    >
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">
          The {model.points.length} films plotted in the constellation, ranked by adjusted score.
        </caption>
        <thead className="sticky top-0 bg-surface-1 text-[13px] text-ink-2 shadow-[0_1px_0_var(--cm-control-border)]">
          <tr>
            <th scope="col" className="py-2.5 pl-5 pr-2 font-medium">Rank</th>
            <th scope="col" className="px-2 py-2.5 font-medium">Film</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Average rating</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Rating count</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">Adjusted score</th>
            <th scope="col" className="py-2.5 pl-2 pr-5 text-right font-medium">Pulled down by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {model.points.map((point) => (
            <tr key={point.movieId}>
              <td className="py-2 pl-5 pr-2 text-ink-2 tabular-nums">{point.rank}</td>
              <th scope="row" className="px-2 py-2 font-medium">
                <Link
                  to={explorerSearchPath(point.title)}
                  className="rounded-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  {titleWithoutYear(point.title)}
                </Link>
                <span className="ml-2 font-normal text-ink-2 tabular-nums">{point.year}</span>
              </th>
              <td className="px-2 py-2 text-right text-ink tabular-nums">{formatScore(point.avgRating)}</td>
              <td className="px-2 py-2 text-right text-ink tabular-nums">{formatCount(point.ratingCount)}</td>
              <td className="px-2 py-2 text-right font-semibold text-accent tabular-nums">{formatScore(point.adjusted)}</td>
              <td className="py-2 pl-2 pr-5 text-right text-ink-2 tabular-nums">{formatScore(point.pull)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
