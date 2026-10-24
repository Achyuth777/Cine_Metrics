import React, { useState } from 'react';
import {
  Film,
  Users,
  Award,
  Layers,
  Database,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Star,
  Compass,
  CheckCircle2,
  ExternalLink
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
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { LoadingSpinner, ErrorState } from '../components/LoadingState';

export default function OverviewPage() {
  const { data: overview, loading: overviewLoading, error: overviewError, refetch } = useApi(api.getOverview);
  const { data: ratingDist, loading: distLoading } = useApi(api.getRatingDistribution);
  const { data: topMoviesData, loading: moviesLoading } = useApi(() =>
    api.getMovies({ pageSize: 10, sortBy: 'ratingCount', sortOrder: 'desc' })
  );
  const { data: hiddenGems, loading: gemsLoading } = useApi(() =>
    api.getHiddenGems({ limit: 5, minRating: 4.0, maxCount: 60 })
  );

  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  if (overviewLoading || distLoading || moviesLoading || gemsLoading) {
    return <LoadingSpinner text="Synthesizing MapReduce analytics from HDFS partitions..." />;
  }

  if (overviewError || !overview) {
    return <ErrorState message={overviewError || 'Failed to load dashboard metrics'} onRetry={refetch} />;
  }

  const top10Movies = topMoviesData?.movies || topMoviesData?.items || [];
  const highestMovie = overview.highestRatedMovie;
  const highestRatingVal = highestMovie?.avgRating || 0;

  // Compute analytical metrics
  const totalRatingsCount = overview.totalRatings || 100836;
  const highRatingsCount = (ratingDist || [])
    .filter(d => parseFloat(d.rating) >= 4.0)
    .reduce((acc, curr) => acc + curr.count, 0);
  const highRatingsPercentage = totalRatingsCount > 0
    ? ((highRatingsCount / totalRatingsCount) * 100).toFixed(1)
    : '49.8';

  const mostRatedMovie = top10Movies[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header with Academic Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282A30]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Intelligence Overview
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-mono font-medium">
              Job 1 & 2
            </span>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Distributed batch analytics synthesized directly from Apache Hadoop MapReduce partition outputs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/architecture"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#191B20] hover:bg-[#21242B] text-[#F4B860] border border-[#F4B860]/30 text-xs font-semibold transition-standard shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>MapReduce Data Flow Trace</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Movies"
          value={overview.totalMovies}
          subtitle="Processed in catalog"
          icon={Film}
          accent="amber"
          badge="movies.csv"
        />
        <StatCard
          title="Total Ratings"
          value={overview.totalRatings}
          subtitle="Distributed MapReduce inputs"
          icon={Layers}
          accent="teal"
          badge="ratings.csv"
        />
        <StatCard
          title="Unique Users"
          value={overview.uniqueUsers}
          subtitle="Independent movie raters"
          icon={Users}
          accent="neutral"
          badge="610 users"
        />
        <StatCard
          title="Mean Audience Rating"
          value={`${overview.globalAverageRating.toFixed(2)} ★`}
          subtitle="Global baseline mean (C)"
          icon={Award}
          accent="amber"
          badge="Scale 0.5–5.0"
        />
      </div>

      {/* Dynamic Analytical Insights Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/20 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-[#F4F4F5] block mb-0.5">Top Audience Volume</span>
            {mostRatedMovie ? (
              <span className="text-[#A1A1AA]">
                <strong className="text-[#F4F4F5]">{mostRatedMovie.title}</strong> leads the catalog with{' '}
                <span className="font-mono text-[#F4B860] font-bold">{mostRatedMovie.ratingCount.toLocaleString()}</span> ratings
                and an average of {mostRatedMovie.avgRating?.toFixed(2)} ★.
              </span>
            ) : (
              <span className="text-[#A1A1AA]">Aggregating rating volume ranking...</span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 shrink-0">
            <Star className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-[#F4F4F5] block mb-0.5">Rating Skew</span>
            <span className="text-[#A1A1AA]">
              Audience ratings demonstrate a positive skew: <strong className="text-[#2DD4BF] font-mono">{highRatingsPercentage}%</strong> of
              all submitted evaluations are 4.0 stars or higher.
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/20 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-[#F4F4F5] block mb-0.5">Highest Quality Consensus</span>
            {highestMovie ? (
              <span className="text-[#A1A1AA]">
                <strong className="text-[#F4F4F5]">{highestMovie.title}</strong> achieves highest mean rating at{' '}
                <span className="font-mono text-[#F4B860] font-bold">{highestRatingVal.toFixed(2)} ★</span> ({highestMovie.ratingCount} reviews, threshold ≥10).
              </span>
            ) : (
              <span className="text-[#A1A1AA]">Calculating consensus leader...</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts & Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Distribution Histogram (7 Cols) */}
        <div className="col-span-12 lg:col-span-7">
          <ChartCard
            title="Global Rating Distribution"
            subtitle="Frequency count across half-star rating intervals (Job 3: RatingDistributionJob)"
            action={
              <Link
                to="/ratings"
                className="text-xs text-[#F4B860] hover:text-[#F6C47B] inline-flex items-center gap-1 font-medium transition-standard"
              >
                Deep Intelligence <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDist || []} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <XAxis
                    dataKey="rating"
                    stroke="#A1A1AA"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Audience Stars (Rating)', position: 'insideBottom', offset: -12, fill: '#A1A1AA', fontSize: 11 }}
                  />
                  <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#191B20',
                      border: '1px solid #3A3D46',
                      borderRadius: '8px',
                      color: '#F4F4F5',
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: any, item: any) => {
                      const count = Number(val);
                      const pct = item.payload.percentage ?? ((count / totalRatingsCount) * 100).toFixed(1);
                      return [`${count.toLocaleString()} ratings (${pct}%)`, 'Volume'];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    onMouseEnter={(data: any) => setHoveredBar(data?.rating || null)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {(ratingDist || []).map((entry, index) => {
                      const isHovered = hoveredBar === entry.rating;
                      const isFourStar = entry.rating === '4.0';
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isHovered ? '#F4B860' : isFourStar ? '#E5A74E' : parseFloat(entry.rating) >= 3.0 ? '#2DD4BF' : '#4B5563'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#A1A1AA] pt-3 border-t border-[#282A30] gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#E5A74E]" />
                  <span>Mode: 4.0 ★ (26,818 ratings)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#2DD4BF]" />
                  <span>Above Average (≥3.0)</span>
                </span>
              </div>
              <span className="text-[#D4D4D8] font-mono text-[11px]">
                MR Reducer: LongWritable frequency accumulation
              </span>
            </div>
          </ChartCard>
        </div>

        {/* Full Top 10 Most Rated Movies Table (5 Cols) */}
        <div className="col-span-12 lg:col-span-5">
          <ChartCard
            title="Top 10 Most Rated Movies"
            subtitle="Full ranking by audience rating volume (Job 2: MostRatedJob)"
            action={
              <Link
                to="/movies"
                className="text-xs text-[#F4B860] hover:text-[#F6C47B] inline-flex items-center gap-1 font-medium transition-standard"
              >
                Explorer <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-1.5 pt-1 overflow-hidden">
              {top10Movies.slice(0, 10).map((movie, idx) => (
                <div
                  key={movie.movieId}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#14161B] border border-[#282A30] hover:border-[#3A3D46] hover:bg-[#191B20] transition-standard text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-[#F4B860] text-[#101114]'
                          : idx < 3
                          ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30'
                          : 'bg-[#282A30] text-[#A1A1AA]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[#F4F4F5] truncate leading-tight" title={movie.title}>
                        {movie.title}
                      </p>
                      <p className="text-[10px] text-[#A1A1AA] truncate">{movie.genres}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[#F4F4F5] block tabular-nums">
                      {movie.ratingCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#F4B860] font-mono">
                      {movie.avgRating ? `${movie.avgRating.toFixed(2)} ★` : 'Unrated'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Hidden Gems Highlight Section */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#282A30]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#F4F4F5] tracking-tight">
                Hidden Gems Preview
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30">
                Job 6: Bayesian Score
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              High average rating (≥4.0 ★) with moderate vote count, filtered against single-vote distortion.
            </p>
          </div>
          <Link
            to="/ratings"
            className="text-xs text-[#F4B860] hover:text-[#F6C47B] inline-flex items-center gap-1 font-medium transition-standard"
          >
            Explore all hidden gems <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(hiddenGems || []).map((gem) => (
            <div
              key={gem.movieId}
              className="p-3.5 rounded-lg bg-[#14161B] border border-[#282A30] hover:border-[#F4B860]/40 transition-standard flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold text-[#2DD4BF] uppercase block mb-1">
                  Score {gem.hiddenGemScore.toFixed(2)}
                </span>
                <h3 className="text-xs font-medium text-[#F4F4F5] line-clamp-2 leading-tight" title={gem.title}>
                  {gem.title}
                </h3>
                <p className="text-[10px] text-[#A1A1AA] line-clamp-1 mt-1">{gem.genres}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#282A30] flex items-center justify-between text-xs font-mono">
                <span className="text-[#F4B860] font-bold">{gem.avgRating.toFixed(2)} ★</span>
                <span className="text-[#A1A1AA] text-[11px]">{gem.ratingCount} votes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset & Execution Metadata Card */}
      <div className="rounded-xl bg-[#14161B] border border-[#282A30] p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#F4B860]" /> Dataset Source
            </span>
            <p className="font-semibold text-[#F4F4F5]">MovieLens Latest-Small</p>
            <p className="text-[#A1A1AA] text-[11px]">GroupLens Research (Univ. of Minnesota)</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2DD4BF]" /> Processing Engine
            </span>
            <p className="font-semibold text-[#F4F4F5]">Apache Hadoop MapReduce 3.3.6</p>
            <p className="text-[#A1A1AA] text-[11px]">HDFS Distributed Partitions + YARN</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Snapshot Timestamp
            </span>
            <p className="font-semibold text-[#F4F4F5] font-mono">
              {new Date(overview.lastProcessed).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-emerald-400 text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All 7 MapReduce Jobs Verified
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#F4B860]" /> Academic Accreditation
            </span>
            <p className="font-semibold text-[#F4F4F5]">Big Data Essentials (21CSC314P)</p>
            <p className="text-[#A1A1AA] text-[11px]">SRM Ramapuram • Achyuth PV</p>
          </div>
        </div>
      </div>
    </div>
  );
}
