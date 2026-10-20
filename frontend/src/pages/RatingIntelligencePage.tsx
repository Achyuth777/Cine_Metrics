import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Info,
  Layers,
  Star
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import ChartCard from '../components/ChartCard';
import { LoadingSpinner, ErrorState } from '../components/LoadingState';

export default function RatingIntelligencePage() {
  const { data: ratingDist, loading: distLoading } = useApi(api.getRatingDistribution);
  const { data: yearRatings, loading: yearLoading } = useApi(api.getYearRatings);
  const { data: ratingTrends, loading: trendsLoading } = useApi(api.getRatingTrends);
  const { data: hiddenGems, loading: gemsLoading, error, refetch } = useApi(() =>
    api.getHiddenGems({ limit: 25, minRating: 4.0 })
  );

  if (distLoading || yearLoading || trendsLoading || gemsLoading) {
    return <LoadingSpinner text="Crunching multi-job MapReduce time-series and Bayesian statistics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  // Filter yearRatings to valid years (1920 to 2020) and sort chronologically
  const filteredYears = (yearRatings || [])
    .filter(y => y.year !== 'Unknown' && Number(y.year) >= 1920 && Number(y.year) <= 2020)
    .sort((a, b) => Number(a.year) - Number(b.year));

  // Aggregate monthly trends to annual trends to make chart smooth and readable
  const yearlyTrendsMap = new Map<string, { year: string; count: number; sum: number }>();
  (ratingTrends || []).forEach(t => {
    const yr = t.yearMonth.split('-')[0];
    const existing = yearlyTrendsMap.get(yr) || { year: yr, count: 0, sum: 0 };
    const cnt = t.ratingCount || (t as any).count || 0;
    existing.count += cnt;
    existing.sum += t.avgRating * cnt;
    yearlyTrendsMap.set(yr, existing);
  });

  const yearlyTrends = Array.from(yearlyTrendsMap.values())
    .map(y => ({
      year: y.year,
      ratingCount: y.count,
      avgRating: y.count > 0 ? Number((y.sum / y.count).toFixed(2)) : 0
    }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252538]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Rating Intelligence & Hidden Gems
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
              Jobs 5, 6, 7
            </span>
          </h2>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Temporal patterns, release year trends, and Bayesian discovery of overlooked cinematic gems.
          </p>
        </div>
      </div>

      {/* Academic Clarification Alert */}
      <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/30 p-4 text-xs text-[#9aa0b8] flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Crucial Distinction for Viva Demonstration:</strong>
          <p className="mt-1 leading-relaxed">
            <span className="text-violet-300 font-medium">1. Movie Release Year (Job 5):</span> Extracted by the Mapper from movie titles (e.g. <em>Toy Story (1995)</em>). Shows ratings based on when films debuted.
            <br />
            <span className="text-indigo-300 font-medium">2. Rating Submission Timestamp (Job 7):</span> Unix epoch timestamp recorded when a reviewer submitted their rating (1996 to 2018). Shows audience reviewing activity over calendar time.
          </p>
        </div>
      </div>

      {/* Time-Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Release Year Ratings Chart */}
        <ChartCard
          title="Average Rating by Release Year (Job 5: YearRatingJob)"
          subtitle="How movie quality is perceived across production decades (1920–2020)"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredYears} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#646a84"
                  fontSize={10}
                  tickLine={false}
                  interval={12}
                />
                <YAxis
                  domain={[2.5, 4.5]}
                  stroke="#646a84"
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161622',
                    border: '1px solid #252538',
                    borderRadius: '8px',
                    color: '#f1f1f8',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)} ★`, 'Avg Rating']}
                />
                <Line
                  type="monotone"
                  dataKey="avgRating"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa0b8] pt-2 border-t border-[#252538]">
            <span>Peak era: 1940s–1970s classics maintain higher average ratings</span>
            <span className="text-violet-400 font-mono">Job 5 Output</span>
          </div>
        </ChartCard>

        {/* Rating Submission Activity Over Time */}
        <ChartCard
          title="Audience Rating Activity Over Time (Job 7: RatingTrendsJob)"
          subtitle="Submission volume by calendar year from Unix epoch timestamp in ratings.csv"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                <XAxis dataKey="year" stroke="#646a84" fontSize={10} tickLine={false} />
                <YAxis stroke="#646a84" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161622',
                    border: '1px solid #252538',
                    borderRadius: '8px',
                    color: '#f1f1f8',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ratings`, 'Activity']}
                />
                <Area
                  type="monotone"
                  dataKey="ratingCount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa0b8] pt-2 border-t border-[#252538]">
            <span>Captures platform engagement surges in MovieLens community</span>
            <span className="text-blue-400 font-mono">Job 7 Output</span>
          </div>
        </ChartCard>
      </div>

      {/* Hidden Gems Section */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0d0d14] border-b border-[#252538] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Hidden Gems Discovery (Job 6: HiddenGemsJob)
            </h3>
            <p className="text-xs text-[#9aa0b8] mt-0.5">
              Filtered for high rating (≥ 4.0 ★) with moderate votes (5–50) scored by Bayesian formula:
              <code className="text-amber-400/90 ml-1 font-mono">WR = (v/(v+m))*R + (m/(v+m))*C</code>
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold self-start sm:self-auto">
            {hiddenGems?.length || 0} Gems Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#9aa0b8]">
            <thead className="bg-[#0d0d14]/60 text-[11px] uppercase tracking-wider text-[#646a84] border-b border-[#252538]">
              <tr>
                <th className="py-3 px-4">Rank & Title</th>
                <th className="py-3 px-3">Genres</th>
                <th className="py-3 px-3 text-right">Raw Avg (★)</th>
                <th className="py-3 px-3 text-right">Rating Count</th>
                <th className="py-3 px-4 text-right">Bayesian Weighted Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252538]">
              {(hiddenGems || []).slice(0, 15).map((gem, idx) => (
                <tr key={gem.movieId} className="hover:bg-[#1c1c2e] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{gem.title}</p>
                        <p className="text-[10px] text-[#646a84] font-mono">ID: #{gem.movieId}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-[#9aa0b8] text-[11px]">{gem.genres}</span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                    {gem.avgRating.toFixed(2)} ★
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-violet-300 font-semibold">
                    {gem.ratingCount} votes
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono font-bold">
                      {gem.weightedScore.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
