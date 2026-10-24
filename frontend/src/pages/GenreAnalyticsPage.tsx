import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tags,
  BarChart2,
  Film,
  Award,
  HelpCircle,
  TrendingUp,
  Layers,
  Info,
  ArrowUpRight,
  BookOpen
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
  const navigate = useNavigate();

  if (loading) {
    return <LoadingSpinner text="Computing MapReduce distributed join across genres..." />;
  }

  if (error || !genres) {
    return <ErrorState message={error || 'Failed to load genre analytics'} onRetry={refetch} />;
  }

  // Sort genres by ratingCount descending for volume/popularity
  const sortedByPopularity = [...genres].sort((a, b) => b.ratingCount - a.ratingCount);

  // Sort genres by avgRating descending for critical acclaim
  const sortedByAvgRating = [...genres].sort((a, b) => b.avgRating - a.avgRating);

  const selectedGenre = genres.find(g => g.genre === selectedGenreName) || sortedByPopularity[0];

  const handleInspectInExplorer = (genreName: string) => {
    navigate(`/movies?genre=${encodeURIComponent(genreName)}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282A30]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Genre Intelligence & Popularity
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-mono font-medium">
              Job 4: Join
            </span>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Distributed join between movie metadata and audience ratings via Hadoop MapReduce.
          </p>
        </div>
      </div>

      {/* 3 High-level Metric Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider block">
              Most Watched Category
            </span>
            <p className="text-lg font-bold text-[#F4F4F5] truncate mt-0.5">
              {sortedByPopularity[0]?.genre}
            </p>
            <p className="text-xs font-mono text-[#D4D4D8]">
              {sortedByPopularity[0]?.ratingCount.toLocaleString()} ratings ({sortedByPopularity[0]?.movieCount} titles)
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider block">
              Highest Mean Rating
            </span>
            <p className="text-lg font-bold text-[#F4F4F5] truncate mt-0.5">
              {sortedByAvgRating[0]?.genre}
            </p>
            <p className="text-xs font-mono text-[#2DD4BF]">
              {sortedByAvgRating[0]?.avgRating.toFixed(2)} ★ ({sortedByAvgRating[0]?.ratingCount.toLocaleString()} ratings)
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#282A30] text-[#F4F4F5] border border-[#3A3D46] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider block">
              Distinct Taxonomy
            </span>
            <p className="text-lg font-bold text-[#F4F4F5] truncate mt-0.5">
              {genres.length} Genres
            </p>
            <p className="text-xs text-[#A1A1AA]">
              Multi-label tokens split in Mapper
            </p>
          </div>
        </div>
      </div>

      {/* Educational Callout: Multi-Genre Taxonomy & MapReduce Join */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4B860]">
          <BookOpen className="w-4 h-4" />
          <span>Academic Note for Viva: Multi-Genre Aggregation & Distributed Join</span>
        </div>
        <p className="text-xs text-[#D4D4D8] leading-relaxed">
          In MovieLens, a single movie record typically spans multiple genres (e.g., <code className="text-[#F4B860] bg-[#14161B] px-1 py-0.5 rounded">Action|Adventure|Sci-Fi</code>).
          In <strong>Job 4 (GenrePopularityJob.java)</strong>, the Mapper splits pipe-delimited genre tokens and emits a separate <code className="text-[#2DD4BF] bg-[#14161B] px-1 py-0.5 rounded">&lt;genre, (count, rating)&gt;</code> tuple for each genre label.
          Consequently, the sum of genre movie counts (<span className="font-mono text-[#F4F4F5]">22,084</span>) exceeds unique catalog titles (<span className="font-mono text-[#F4F4F5]">9,742</span>). This multi-label attribution prevents undercounting complex cross-genre works.
        </p>
      </div>

      {/* 2 Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Volume (Audience Popularity) */}
        <ChartCard
          title="Genre Rating Volume (Most Reviewed)"
          subtitle="Total ratings accumulated per genre. Demonstrates mainstream audience engagement."
        >
          <div className="h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedByPopularity}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 45, bottom: 5 }}
              >
                <XAxis type="number" stroke="#A1A1AA" fontSize={10} tickLine={false} />
                <YAxis
                  dataKey="genre"
                  type="category"
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191B20',
                    border: '1px solid #3A3D46',
                    borderRadius: '8px',
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ratings`, 'Volume']}
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
                      fill={entry.genre === selectedGenre?.genre ? '#F4B860' : '#E5A74E'}
                      opacity={entry.genre === selectedGenre?.genre ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Average Rating (Critical Acclaim) */}
        <ChartCard
          title="Genre Average Ratings (Critical Acclaim)"
          subtitle="Mean audience score (0.5 to 5.0) per genre. Shows critical appreciation."
        >
          <div className="h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedByAvgRating}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 45, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[2.5, 4.5]}
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  dataKey="genre"
                  type="category"
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191B20',
                    border: '1px solid #3A3D46',
                    borderRadius: '8px',
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)} ★`, 'Mean Score']}
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
                      fill={entry.genre === selectedGenre?.genre ? '#2DD4BF' : '#14B8A6'}
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
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] shadow-sm overflow-hidden">
        <div className="p-4 bg-[#14161B] border-b border-[#282A30] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#F4F4F5]">Genre Analytics Summary Table</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Exact metrics emitted by Reducer partition: unique movie count, total rating volume, and mean rating.
            </p>
          </div>
          <span className="text-xs font-mono text-[#F4B860]">
            {genres.length} Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#A1A1AA]">
            <thead className="bg-[#14161B] text-[11px] uppercase tracking-wider text-[#A1A1AA] border-b border-[#282A30]">
              <tr>
                <th className="py-3 px-4">Genre Category</th>
                <th className="py-3 px-3 text-right">Unique Movie Count</th>
                <th className="py-3 px-3 text-right">Total Ratings Processed</th>
                <th className="py-3 px-3 text-right">Average Rating (★)</th>
                <th className="py-3 px-4 text-center">Avg Ratings / Movie</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282A30]">
              {sortedByPopularity.map((g) => {
                const ratingsPerMovie = g.movieCount > 0 ? (g.ratingCount / g.movieCount).toFixed(1) : '0';
                const isSelected = g.genre === selectedGenre?.genre;
                return (
                  <tr
                    key={g.genre}
                    onClick={() => setSelectedGenreName(g.genre)}
                    className={`hover:bg-[#21242B] transition-standard cursor-pointer ${
                      isSelected ? 'bg-[#F4B860]/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-[#F4F4F5] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#F4B860]' : 'bg-[#282A30]'}`} />
                      {g.genre}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#D4D4D8] font-medium tabular-nums">
                      {g.movieCount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#F4F4F5] font-bold tabular-nums">
                      {g.ratingCount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-[#F4B860] tabular-nums">
                      {g.avgRating.toFixed(2)} ★
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[#A1A1AA] tabular-nums">
                      {ratingsPerMovie}x
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectInExplorer(g.genre);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#14161B] hover:bg-[#282A30] text-[#D4D4D8] hover:text-[#F4B860] border border-[#282A30] text-[11px] font-medium transition-standard"
                      >
                        Browse <ArrowUpRight className="w-3 h-3" />
                      </button>
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
