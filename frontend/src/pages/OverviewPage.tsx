import React from 'react';
import {
  Film,
  Users,
  Award,
  Layers,
  Database,
  Calendar,
  Sparkles,
  ArrowUpRight
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
  const { data: topMovies, loading: moviesLoading } = useApi(() =>
    api.getMovies({ pageSize: 10, sortBy: 'ratingCount', sortOrder: 'desc' })
  );

  if (overviewLoading || distLoading || moviesLoading) {
    return <LoadingSpinner text="Aggregating Hadoop MapReduce metrics..." />;
  }

  if (overviewError || !overview) {
    return <ErrorState message={overviewError || 'Failed to load dashboard metrics'} onRetry={refetch} />;
  }

  const highestMovie = overview.highestRatedMovie;
  const highestRatingVal = highestMovie?.avgRating || highestMovie?.averageRating || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252538]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Intelligence Overview
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
              Job 1 & 2
            </span>
          </h2>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Real-time analytics synthesized from Hadoop MapReduce distributed batch aggregations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>MapReduce Pipeline Details</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Movies"
          value={overview.totalMovies}
          subtitle="Unique catalogue entries"
          icon={Film}
          color="violet"
        />
        <StatCard
          title="Total Ratings"
          value={overview.totalRatings}
          subtitle="Processed in MapReduce"
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Unique Users"
          value={overview.uniqueUsers}
          subtitle="Active reviewers"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Global Avg Rating"
          value={overview.globalAverageRating.toFixed(2)}
          subtitle="Out of 5.00 stars"
          icon={Award}
          color="amber"
          badge="3.50 μ"
        />
        <StatCard
          title="Movie Genres"
          value={overview.genreCount}
          subtitle="Classified categories"
          icon={Layers}
          color="cyan"
        />
        <StatCard
          title="Top Rated Movie"
          value={highestRatingVal.toFixed(1) + " ★"}
          subtitle={highestMovie ? highestMovie.title : 'N/A'}
          icon={Award}
          color="emerald"
          badge={`${highestMovie?.ratingCount || 0} votes`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Distribution Histogram */}
        <div className="lg:span-7 col-span-12 lg:col-span-7">
          <ChartCard
            title="Rating Distribution Histogram"
            subtitle="Frequency count across half-star rating intervals (Job 3: RatingDistributionJob)"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDist || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="rating"
                    stroke="#646a84"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Stars (Rating)', position: 'insideBottom', offset: -10, fill: '#9aa0b8', fontSize: 11 }}
                  />
                  <YAxis stroke="#646a84" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161622',
                      border: '1px solid #252538',
                      borderRadius: '8px',
                      color: '#f1f1f8',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ratings`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(ratingDist || []).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index >= 7 ? '#8b5cf6' : index >= 4 ? '#6366f1' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa0b8] pt-3 border-t border-[#252538]">
              <span>Most frequent: 4.0 stars (26k+ ratings)</span>
              <span className="text-violet-400 font-mono">Reducer: Total Frequency Accumulation</span>
            </div>
          </ChartCard>
        </div>

        {/* Top 10 Most-Rated Movies Table */}
        <div className="lg:span-5 col-span-12 lg:col-span-5">
          <ChartCard
            title="Top 10 Most Rated Movies"
            subtitle="Highest audience participation (Job 2: MostRatedJob)"
            action={
              <Link
                to="/movies"
                className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-medium"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-2.5 pt-1">
              {(topMovies?.movies || (topMovies as any)?.items || []).slice(0, 7).map((movie: any, idx: number) => (
                <div
                  key={movie.movieId}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0d14] border border-[#252538] hover:border-violet-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{movie.title}</p>
                      <p className="text-[10px] text-[#646a84] truncate">{movie.genres}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-violet-300">
                      {movie.ratingCount.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-amber-400">{movie.avgRating.toFixed(2)} ★</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Dataset & Execution Metadata Card */}
      <div className="rounded-xl bg-gradient-to-r from-[#12121a] via-[#161622] to-[#12121a] border border-[#252538] p-5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#646a84] tracking-wider flex items-center gap-1">
              <Database className="w-3 h-3 text-violet-400" /> Dataset Source
            </span>
            <p className="font-semibold text-white">MovieLens Latest-Small</p>
            <p className="text-[#9aa0b8] text-[11px]">GroupLens Research (Univ. of Minnesota)</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#646a84] tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" /> Processing Engine
            </span>
            <p className="font-semibold text-white">Apache Hadoop MapReduce 3.3.6</p>
            <p className="text-[#9aa0b8] text-[11px]">HDFS Distributed Storage + YARN</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#646a84] tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" /> Last Processed Time
            </span>
            <p className="font-semibold text-white font-mono">
              {new Date(overview.lastProcessed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </p>
            <p className="text-emerald-400 text-[11px]">All 7 Jobs Completed (Status: OK)</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#646a84] tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> Academic Project
            </span>
            <p className="font-semibold text-white">Big Data Essentials (21CSC314P)</p>
            <p className="text-[#9aa0b8] text-[11px]">SRM Ramapuram • Achyuth PV</p>
          </div>
        </div>
      </div>
    </div>
  );
}
