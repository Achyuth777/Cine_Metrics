import React, { useState } from 'react';
import {
  Tags,
  BarChart2,
  Film,
  Award,
  HelpCircle,
  TrendingUp,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import ChartCard from '../components/ChartCard';
import { LoadingSpinner, ErrorState } from '../components/LoadingState';

export default function GenreAnalyticsPage() {
  const { data: genres, loading, error, refetch } = useApi(api.getGenres);
  const [selectedGenreName, setSelectedGenreName] = useState<string | null>(null);

  if (loading) {
    return <LoadingSpinner text="Computing MapReduce distributed join across genres..." />;
  }

  if (error || !genres) {
    return <ErrorState message={error || 'Failed to load genre analytics'} onRetry={refetch} />;
  }

  // Sort genres by ratingCount descending for popularity
  const sortedByPopularity = [...genres].sort((a, b) => b.ratingCount - a.ratingCount);

  // Sort genres by avgRating descending for quality
  const sortedByAvgRating = [...genres].sort((a, b) => b.avgRating - a.avgRating);

  const selectedGenre = genres.find(g => g.genre === selectedGenreName) || sortedByPopularity[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252538]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Genre Popularity & Rating Intelligence
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
              Job 4: Map-Side Join
            </span>
          </h2>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Distributed join between movie metadata and user ratings via Hadoop DistributedCache.
          </p>
        </div>
      </div>

      {/* High-level Genre Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#161622] border border-[#252538] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#646a84]">Most Popular Genre</span>
            <p className="text-base font-bold text-white mt-0.5">{sortedByPopularity[0]?.genre}</p>
            <p className="text-[11px] text-[#9aa0b8]">
              {sortedByPopularity[0]?.ratingCount.toLocaleString()} total ratings
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#161622] border border-[#252538] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#646a84]">Highest Average Genre</span>
            <p className="text-base font-bold text-white mt-0.5">{sortedByAvgRating[0]?.genre}</p>
            <p className="text-[11px] text-[#9aa0b8]">
              {sortedByAvgRating[0]?.avgRating.toFixed(2)} ★ mean audience score
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#161622] border border-[#252538] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#646a84]">Distinct Genres Analyzed</span>
            <p className="text-base font-bold text-white mt-0.5">{genres.length} Categories</p>
            <p className="text-[11px] text-[#9aa0b8]">Multi-label tags split in Mapper</p>
          </div>
        </div>
      </div>

      {/* 2 Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Popularity Chart */}
        <ChartCard
          title="Genre Rating Volume (Audience Popularity)"
          subtitle="Total review submissions per genre. Shows what audiences watch most."
        >
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedByPopularity}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="#646a84" fontSize={10} tickLine={false} />
                <YAxis
                  dataKey="genre"
                  type="category"
                  stroke="#646a84"
                  fontSize={10}
                  tickLine={false}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161622',
                    border: '1px solid #252538',
                    borderRadius: '8px',
                    color: '#f1f1f8',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ratings`, 'Total Ratings']}
                />
                <Bar
                  dataKey="ratingCount"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => setSelectedGenreName(entry?.genre)}
                  className="cursor-pointer"
                >
                  {sortedByPopularity.map((entry) => (
                    <Cell
                      key={`pop-${entry.genre}`}
                      fill={entry.genre === selectedGenre?.genre ? '#8b5cf6' : '#3b82f6'}
                      opacity={entry.genre === selectedGenre?.genre ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Genre Average Rating Comparison Chart */}
        <ChartCard
          title="Genre Average Ratings (Critical Acclaim)"
          subtitle="Mean star score (0 to 5) per genre. Shows critical appreciation."
        >
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedByAvgRating}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[2.5, 4.5]}
                  stroke="#646a84"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  dataKey="genre"
                  type="category"
                  stroke="#646a84"
                  fontSize={10}
                  tickLine={false}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161622',
                    border: '1px solid #252538',
                    borderRadius: '8px',
                    color: '#f1f1f8',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)} ★`, 'Average Rating']}
                />
                <Bar
                  dataKey="avgRating"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => setSelectedGenreName(entry?.genre)}
                  className="cursor-pointer"
                >
                  {sortedByAvgRating.map((entry) => (
                    <Cell
                      key={`avg-${entry.genre}`}
                      fill={entry.genre === selectedGenre?.genre ? '#8b5cf6' : '#10b981'}
                      opacity={entry.genre === selectedGenre?.genre ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Genre Ranking Table */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0d0d14] border-b border-[#252538] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Genre Analytics Summary Table</h3>
            <p className="text-xs text-[#9aa0b8] mt-0.5">
              Distinguishing unique movie count from total ratings received (Job 4 output)
            </p>
          </div>
          <span className="text-xs font-mono text-violet-400">
            {genres.length} Genres
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#9aa0b8]">
            <thead className="bg-[#0d0d14]/60 text-[11px] uppercase tracking-wider text-[#646a84] border-b border-[#252538]">
              <tr>
                <th className="py-3 px-4">Genre Category</th>
                <th className="py-3 px-3 text-right">Unique Movie Count</th>
                <th className="py-3 px-3 text-right">Total Ratings Processed</th>
                <th className="py-3 px-3 text-right">Average Rating (★)</th>
                <th className="py-3 px-4 text-center">Avg Ratings / Movie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252538]">
              {sortedByPopularity.map((g) => {
                const ratingsPerMovie = g.movieCount > 0 ? (g.ratingCount / g.movieCount).toFixed(1) : '0';
                return (
                  <tr
                    key={g.genre}
                    onClick={() => setSelectedGenreName(g.genre)}
                    className={`hover:bg-[#1c1c2e] transition-colors cursor-pointer ${
                      g.genre === selectedGenre?.genre ? 'bg-violet-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      {g.genre}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-cyan-300 font-medium">
                      {g.movieCount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-violet-300 font-bold">
                      {g.ratingCount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                      {g.avgRating.toFixed(2)} ★
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[#9aa0b8]">
                      {ratingsPerMovie}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
