import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Info,
  Layers,
  Star,
  ExternalLink,
  Sliders,
  Filter,
  ArrowUpRight,
  BookOpen
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
import { HiddenGem } from '../types';
import ChartCard from '../components/ChartCard';
import { LoadingSpinner, ErrorState } from '../components/LoadingState';

export default function RatingIntelligencePage() {
  const { data: ratingDist, loading: distLoading } = useApi(api.getRatingDistribution);
  const { data: yearRatings, loading: yearLoading } = useApi(api.getYearRatings);
  const { data: ratingTrends, loading: trendsLoading } = useApi(api.getRatingTrends);

  // Dynamic Interactive Hidden Gems Thresholds
  const [minRatingThreshold, setMinRatingThreshold] = useState<number>(4.0);
  const [maxCountThreshold, setMaxCountThreshold] = useState<number>(80);
  const [minCountThreshold, setMinCountThreshold] = useState<number>(10);
  const [gemsList, setGemsList] = useState<HiddenGem[]>([]);
  const [gemsLoading, setGemsLoading] = useState(false);

  const navigate = useNavigate();

  const fetchDynamicGems = () => {
    setGemsLoading(true);
    api.getHiddenGems({
      limit: 25,
      minRating: minRatingThreshold,
      minCount: minCountThreshold,
      maxCount: maxCountThreshold
    })
      .then(res => {
        setGemsList(res);
        setGemsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch gems:', err);
        setGemsLoading(false);
      });
  };

  useEffect(() => {
    fetchDynamicGems();
  }, [minRatingThreshold, maxCountThreshold, minCountThreshold]);

  if (distLoading || yearLoading || trendsLoading) {
    return <LoadingSpinner text="Computing multi-job MapReduce time-series and Bayesian statistics..." />;
  }

  // Filter yearRatings to valid years (1920 to 2018) and sort chronologically
  const filteredYears = (yearRatings || [])
    .filter(y => y.year !== 'Unknown' && Number(y.year) >= 1920 && Number(y.year) <= 2018)
    .sort((a, b) => Number(a.year) - Number(b.year));

  // Aggregate monthly trends to annual trends for readability
  const yearlyTrendsMap = new Map<string, { year: string; count: number; sum: number }>();
  (ratingTrends || []).forEach(t => {
    const yr = t.yearMonth.split('-')[0];
    const existing = yearlyTrendsMap.get(yr) || { year: yr, count: 0, sum: 0 };
    const cnt = t.count || 0;
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
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282A30]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Rating Intelligence & Bayesian Gems
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-mono font-medium">
              Jobs 5, 6, 7
            </span>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Temporal rating dynamics, release year evolution, and Bayesian detection of under-watched cinema masterpieces.
          </p>
        </div>
      </div>

      {/* Academic Distinction Callout */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 text-xs text-[#A1A1AA] flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-[#F4B860] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-[#F4F4F5] text-xs">Essential Distinction for Academic Evaluation:</strong>
          <p className="leading-relaxed">
            <span className="text-[#F4B860] font-semibold">1. Movie Release Year (Job 5):</span> Parsed from movie titles using regular expression matching (e.g. <em>Toy Story (1995)</em>). Tracks historical perception of production eras.
            <br />
            <span className="text-[#2DD4BF] font-semibold">2. Rating Submission Timestamp (Job 7):</span> Unix epoch integer from <code className="text-[#F4F4F5]">ratings.csv</code>, converted to calendar Year-Month in Map phase. Captures platform user activity surges from 1996 through 2018.
          </p>
        </div>
      </div>

      {/* 2 Temporal Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Release Year Ratings Chart (Job 5) */}
        <ChartCard
          title="Perception by Release Year (Job 5: YearRatingJob)"
          subtitle="Mean audience score by movie release decade (1920–2018)"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredYears} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#282A30" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                  interval={12}
                />
                <YAxis
                  domain={[2.5, 4.5]}
                  stroke="#A1A1AA"
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191B20',
                    border: '1px solid #3A3D46',
                    borderRadius: '8px',
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)} ★`, 'Avg Rating']}
                />
                <Line
                  type="monotone"
                  dataKey="avgRating"
                  stroke="#F4B860"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#F4B860' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#A1A1AA] pt-2 border-t border-[#282A30]">
            <span>Peak golden era: 1940s–1970s classics sustain high mean scores (~3.8 ★)</span>
            <span className="text-[#F4B860] font-mono text-[11px]">Job 5 Reducer</span>
          </div>
        </ChartCard>

        {/* Rating Submission Activity Over Time (Job 7) */}
        <ChartCard
          title="Platform Review Activity Timeline (Job 7: RatingTrendsJob)"
          subtitle="Annual review submissions from MovieLens Unix epoch timestamps"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorCountTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#282A30" vertical={false} />
                <XAxis dataKey="year" stroke="#A1A1AA" fontSize={10} tickLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191B20',
                    border: '1px solid #3A3D46',
                    borderRadius: '8px',
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} reviews`, 'Activity']}
                />
                <Area
                  type="monotone"
                  dataKey="ratingCount"
                  stroke="#2DD4BF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCountTeal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#A1A1AA] pt-2 border-t border-[#282A30]">
            <span>Captures community review surges around 2000 and 2015</span>
            <span className="text-[#2DD4BF] font-mono text-[11px]">Job 7 Reducer</span>
          </div>
        </ChartCard>
      </div>

      {/* Viva Voce Bayesian Shrinkage Mathematics Banner */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F4B860]">
          <BookOpen className="w-4 h-4" />
          <span>Academic Viva Focus: Why Raw Arithmetic Means Fail & How Bayesian Shrinkage Fixes It</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#D4D4D8] leading-relaxed">
          <div className="space-y-1.5 p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
            <span className="text-red-400 font-semibold block">The Arithmetic Average Pitfall:</span>
            A film with 1 single 5.0-star rating would hold an arithmetic average of 5.00 ★, erroneously topping
            the global charts ahead of <em>The Shawshank Redemption</em> (317 reviews, 4.43 ★) or <em>Pulp Fiction</em> (307 reviews, 4.20 ★).
          </div>
          <div className="space-y-1.5 p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
            <span className="text-[#2DD4BF] font-semibold block">The Bayesian Solution (Job 6):</span>
            We apply the true Bayesian formula <code className="text-[#F4B860] font-mono">WR = (v/(v+m))*R + (m/(v+m))*C</code> with prior weight <code className="text-[#F4B860] font-mono">m = 10</code>.
            A 1-vote 5-star movie shrinks toward the global average <code className="text-[#F4B860] font-mono">C = 3.50</code>, giving a fair score of 3.64 ★.
          </div>
        </div>
      </div>

      {/* Hidden Gems Dynamic Thresholds & Results */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#282A30]">
          <div>
            <h2 className="text-sm font-semibold text-[#F4F4F5] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F4B860]" />
              Interactive Hidden Gems Engine (Job 6: HiddenGemsJob)
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Adjust minimum rating and maximum vote ceilings to discover overlooked cinema across the entire catalog.
            </p>
          </div>

          {/* Interactive Threshold Inputs */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <label htmlFor="min-rating-input" className="text-[#A1A1AA] text-[11px]">Min Rating:</label>
              <input
                id="min-rating-input"
                type="number"
                step="0.1"
                min="3.0"
                max="5.0"
                value={minRatingThreshold}
                onChange={(e) => setMinRatingThreshold(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded bg-[#14161B] border border-[#282A30] text-[#F4B860] font-mono text-xs focus:border-[#F4B860]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="max-votes-input" className="text-[#A1A1AA] text-[11px]">Max Votes:</label>
              <input
                id="max-votes-input"
                type="number"
                min="15"
                max="300"
                value={maxCountThreshold}
                onChange={(e) => setMaxCountThreshold(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded bg-[#14161B] border border-[#282A30] text-[#F4F4F5] font-mono text-xs focus:border-[#F4B860]"
              />
            </div>

            <span className="text-xs font-mono px-2 py-1 rounded bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-bold">
              {gemsList.length} Gems Found
            </span>
          </div>
        </div>

        {/* Gems Table */}
        {gemsLoading ? (
          <div className="py-12">
            <LoadingSpinner text="Computing Bayesian scores with updated thresholds..." />
          </div>
        ) : gemsList.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A1A1AA]">
            No hidden gems meet the specified criteria. Try lowering the minimum rating or increasing the maximum vote ceiling.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#A1A1AA]">
              <thead className="bg-[#14161B] text-[11px] uppercase tracking-wider text-[#A1A1AA] border-b border-[#282A30]">
                <tr>
                  <th className="py-3 px-4">Rank & Title</th>
                  <th className="py-3 px-3">Genres</th>
                  <th className="py-3 px-3 text-right">Raw Audience Mean</th>
                  <th className="py-3 px-3 text-right">Rating Count</th>
                  <th className="py-3 px-3 text-right">Bayesian (WR)</th>
                  <th className="py-3 px-4 text-right">Composite Score</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282A30]">
                {gemsList.map((gem, idx) => (
                  <tr key={gem.movieId} className="hover:bg-[#21242B] transition-standard">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-[#F4B860]/10 border border-[#F4B860]/30 text-[#F4B860] flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-[#F4F4F5]">{gem.title}</p>
                          <p className="text-[10px] text-[#A1A1AA] font-mono">ID: #{gem.movieId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[#D4D4D8] text-[11px]">{gem.genres}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-[#F4B860] tabular-nums">
                      {gem.avgRating.toFixed(2)} ★
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#F4F4F5] font-semibold tabular-nums">
                      {gem.ratingCount} votes
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#2DD4BF] font-semibold tabular-nums">
                      {gem.weightedScore ? `${gem.weightedScore.toFixed(2)} ★` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#14161B] border border-[#282A30] text-[#F4B860] font-mono font-bold tabular-nums">
                        {gem.hiddenGemScore.toFixed(3)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => navigate(`/movies?search=${encodeURIComponent(gem.title)}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#14161B] hover:bg-[#282A30] text-[#D4D4D8] hover:text-[#F4B860] border border-[#282A30] text-[11px] transition-standard"
                      >
                        Inspect <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
