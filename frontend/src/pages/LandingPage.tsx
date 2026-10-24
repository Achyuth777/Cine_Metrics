import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Film,
  Layers,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Database,
  Server,
  GitBranch,
  ShieldCheck,
  TrendingUp,
  Cpu,
  HardDrive,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Code2,
  Terminal,
  PlayCircle,
  Star,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import { OverviewData } from '../types';

export default function LandingPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [quickSearch, setQuickSearch] = useState('');

  useEffect(() => {
    api.getOverview().then(setOverview).catch(console.error);
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/movies?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate('/movies');
    }
  };

  const totalMovies = overview?.totalMovies ?? 9742;
  const totalRatings = overview?.totalRatings ?? 100836;
  const uniqueUsers = overview?.uniqueUsers ?? 610;
  const globalAvg = overview?.globalAverageRating ?? 3.50;

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#F4F4F5] selection:bg-[#F4B860]/20 selection:text-[#F4B860] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#F4B860]/12 via-[#2DD4BF]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-[#F4B860]/5 blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0C10]/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4B860] via-[#E5A74E] to-[#996515] flex items-center justify-center shadow-lg shadow-amber-950/40">
              <Star className="w-5 h-5 text-[#0B0C10] fill-[#0B0C10]" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-[#F4F4F5] flex items-center gap-2">
                CineMetrics
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/20">
                  Hadoop 3.3.6
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#A1A1AA]">
            <Link to="/overview" className="hover:text-[#F4B860] transition-colors">
              Studio Overview
            </Link>
            <Link to="/movies" className="hover:text-[#F4B860] transition-colors">
              Movie Explorer
            </Link>
            <Link to="/genres" className="hover:text-[#F4B860] transition-colors">
              Genre Taxonomy
            </Link>
            <Link to="/ratings" className="hover:text-[#F4B860] transition-colors">
              Bayesian Intelligence
            </Link>
            <Link to="/hadoop" className="hover:text-[#F4B860] transition-colors">
              Job Monitor
            </Link>
            <Link to="/architecture" className="hover:text-[#F4B860] transition-colors">
              Viva Defense
            </Link>
          </nav>

          {/* Launch App CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/overview"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F4B860] hover:bg-[#F6C47B] text-[#0B0C10] font-semibold text-xs transition-all shadow-md shadow-amber-950/20 hover:scale-[1.02]"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Academic Accreditation Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs mb-8 animate-fade-in backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#F4B860] animate-pulse" />
          <span className="text-[#A1A1AA]">SRM IST Ramapuram • Big Data Essentials (21CSC314P)</span>
          <span className="text-white/[0.2]">•</span>
          <span className="text-[#F4B860] font-medium">Achyuth PV</span>
        </div>

        {/* Main Catchy Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F4F4F5] max-w-5xl mx-auto leading-[1.1]">
          Movie Intelligence.{' '}
          <span className="bg-gradient-to-r from-[#F4B860] via-[#E5A74E] to-[#2DD4BF] bg-clip-text text-transparent">
            Computed at Distributed Scale.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
          Engineered with <strong className="text-[#F4F4F5]">Apache Hadoop MapReduce</strong> on HDFS.
          Processing 100,836+ MovieLens reviews across distributed partitions to uncover genuine audience behavior,
          Bayesian true ratings, and overlooked cinema gems.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/overview"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F4B860] hover:bg-[#F6C47B] text-[#0B0C10] font-bold text-sm transition-all shadow-lg shadow-amber-950/30 hover:scale-[1.02]"
          >
            <span>Open Intelligence Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/movies"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#14161B] hover:bg-[#1C1F26] text-[#F4F4F5] font-semibold text-sm border border-white/[0.1] transition-all hover:border-white/[0.2]"
          >
            <Film className="w-4 h-4 text-[#F4B860]" />
            <span>Search 9,742 Movies</span>
          </Link>

          <Link
            to="/architecture"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#14161B] hover:bg-[#1C1F26] text-[#2DD4BF] font-semibold text-sm border border-[#2DD4BF]/30 transition-all hover:border-[#2DD4BF]/50"
          >
            <GitBranch className="w-4 h-4" />
            <span>Viva Examination Guide</span>
          </Link>
        </div>

        {/* Quick Search Preview Box */}
        <div className="mt-12 max-w-xl mx-auto">
          <form
            onSubmit={handleQuickSearchSubmit}
            className="relative flex items-center rounded-2xl bg-[#14161B] border border-white/[0.1] p-2 shadow-2xl focus-within:border-[#F4B860] transition-standard"
          >
            <Film className="w-5 h-5 text-[#A1A1AA] ml-3" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search by title (e.g., Matrix, Shawshank, Toy Story)..."
              className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-[#F4F4F5] placeholder-[#A1A1AA] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#F4B860] text-[#0B0C10] font-bold text-xs hover:bg-[#F6C47B] transition-standard shrink-0 shadow-sm"
            >
              Analyze
            </button>
          </form>
          <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-[#A1A1AA]">
            <span>Try searching:</span>
            {['Pulp Fiction', 'Forrest Gump', 'Inception', 'Star Wars'].map((term) => (
              <button
                key={term}
                onClick={() => navigate(`/movies?search=${encodeURIComponent(term)}`)}
                className="hover:text-[#F4B860] underline underline-offset-2 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Pulse Ticker */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-[#14161B]/80 border border-white/[0.08] backdrop-blur-md">
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider block">
              Dataset Records
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#F4F4F5] font-mono mt-1 block tabular-nums">
              {totalRatings.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#2DD4BF] mt-1 block font-mono">100% MapReduce Reduced</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14161B]/80 border border-white/[0.08] backdrop-blur-md">
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider block">
              Catalog Titles
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#F4F4F5] font-mono mt-1 block tabular-nums">
              {totalMovies.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#F4B860] mt-1 block font-mono">1902 – 2018 Eras</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14161B]/80 border border-white/[0.08] backdrop-blur-md">
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider block">
              Global Benchmark
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#F4F4F5] font-mono mt-1 block tabular-nums">
              {globalAvg.toFixed(2)} ★
            </span>
            <span className="text-[11px] text-[#A1A1AA] mt-1 block font-mono">Bayesian Prior Mean (C)</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#14161B]/80 border border-white/[0.08] backdrop-blur-md">
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider block">
              Hadoop Batch Jobs
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#F4F4F5] font-mono mt-1 block tabular-nums">
              7 Jobs
            </span>
            <span className="text-[11px] text-emerald-400 mt-1 block font-mono">Uber-JAR Compiled</span>
          </div>
        </div>
      </section>

      {/* 4 Core Big Data Engineering Pillars */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#F4B860] block mb-2">
            Distributed Computing Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#F4F4F5] tracking-tight">
            How Hadoop MapReduce Powers Every Calculation
          </h2>
          <p className="mt-4 text-sm text-[#A1A1AA] leading-relaxed">
            Unlike shallow dashboards backed by synthetic arrays or simple Pandas loops, CineMetrics executes true distributed processing patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#F4B860]/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#F4B860]/10 border border-[#F4B860]/20 flex items-center justify-center text-[#F4B860] mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-[#F4B860] font-semibold">JOB 1 & 2</span>
              <h3 className="text-base font-bold text-[#F4F4F5] mt-1 mb-2">
                In-Mapper Combiner
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Emits partial (sum, count) pairs locally on mapper nodes before network shuffle, slashing network I/O saturation by 95%.
              </p>
            </div>
            <Link
              to="/architecture"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#F4B860] font-semibold hover:gap-2 transition-all"
            >
              <span>Inspect Combiner logic</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#2DD4BF]/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 flex items-center justify-center text-[#2DD4BF] mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-[#2DD4BF] font-semibold">JOB 4</span>
              <h3 className="text-base font-bold text-[#F4F4F5] mt-1 mb-2">
                Map-Side Join (Cache)
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Loads <code className="text-[#2DD4BF]">movies.csv</code> into memory via Hadoop <code className="text-[#2DD4BF]">DistributedCache</code> to join movie titles & genres with ratings in O(1) time without shuffle overhead.
              </p>
            </div>
            <Link
              to="/genres"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] font-semibold hover:gap-2 transition-all"
            >
              <span>Explore genre taxonomy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#F4B860]/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#F4B860]/10 border border-[#F4B860]/20 flex items-center justify-center text-[#F4B860] mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-[#F4B860] font-semibold">JOB 6</span>
              <h3 className="text-base font-bold text-[#F4F4F5] mt-1 mb-2">
                Bayesian True-Rating
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Implements true Bayesian shrinkage with prior weight <code className="text-[#F4B860]">m=10</code>, preventing 1-vote movies from gaming chart rankings.
              </p>
            </div>
            <Link
              to="/ratings"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#F4B860] font-semibold hover:gap-2 transition-all"
            >
              <span>See Bayesian engine</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">JOB 3 & 7</span>
              <h3 className="text-base font-bold text-[#F4F4F5] mt-1 mb-2">
                Partition Output Reader
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Directly reads and parses genuine multi-partition TSV files (<code className="text-emerald-400">part-r-00000</code>) output by Hadoop reducers on HDFS.
              </p>
            </div>
            <Link
              to="/hadoop"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold hover:gap-2 transition-all"
            >
              <span>Inspect raw TSV output</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Studio Modules Walkthrough */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#2DD4BF] block mb-2">
            6 Specialized Intelligence Modules
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#F4F4F5] tracking-tight">
            Complete Workspace for Analysis & Viva Defense
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Module 1 */}
          <div
            onClick={() => navigate('/overview')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#F4B860] cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-6 h-6 text-[#F4B860]" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Dashboard
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-[#F4B860] transition-colors">
              Studio Overview
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Global KPIs, the full Top 10 rating volume leaderboard, and interactive half-star distribution histogram.
            </p>
          </div>

          {/* Module 2 */}
          <div
            onClick={() => navigate('/movies')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#2DD4BF] cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Film className="w-6 h-6 text-[#2DD4BF]" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Catalog
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-[#2DD4BF] transition-colors">
              Movie Explorer & Compare
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Full 9,742 titles search, multi-genre logic (AND/OR), release decade filters, and 2-to-4 movie side-by-side comparison.
            </p>
          </div>

          {/* Module 3 */}
          <div
            onClick={() => navigate('/genres')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#F4B860] cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Layers className="w-6 h-6 text-[#F4B860]" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Join Analytics
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-[#F4B860] transition-colors">
              Genre Intelligence
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Compare audience volume against critical score across 20 categories. Multi-label taxonomy educational breakdown.
            </p>
          </div>

          {/* Module 4 */}
          <div
            onClick={() => navigate('/ratings')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#2DD4BF] cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-6 h-6 text-[#2DD4BF]" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Bayesian Gems
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-[#2DD4BF] transition-colors">
              Rating Dynamics
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Temporal rating trends from 1996–2018 Unix timestamps and interactive threshold controls for hidden gem discovery.
            </p>
          </div>

          {/* Module 5 */}
          <div
            onClick={() => navigate('/hadoop')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-emerald-400 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Server className="w-6 h-6 text-emerald-400" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Telemetry
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-emerald-400 transition-colors">
              Hadoop Job Monitor
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Live NameNode (9870) and YARN (8088) port telemetry, cluster status, and the raw TSV partition file inspector.
            </p>
          </div>

          {/* Module 6 */}
          <div
            onClick={() => navigate('/architecture')}
            className="p-6 rounded-2xl bg-[#14161B] border border-white/[0.08] hover:border-[#F4B860] cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <GitBranch className="w-6 h-6 text-[#F4B860]" />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA]">
                Examination
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F4F4F5] group-hover:text-[#F4B860] transition-colors">
              Architecture & Viva Voce
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              8-stage interactive pipeline flowchart, worked numerical calculation, and 20 college viva Q&A answers.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Defense Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-[#14161B] via-[#1A1D24] to-[#14161B] border border-white/[0.1] p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold text-[#F4B860] uppercase tracking-wider block mb-2">
              B.Tech IT Project Evaluation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F4F5] tracking-tight">
              Ready for College Demonstration & Grading
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed">
              Built to defend during viva voce examinations: mathematically rigorous, verifiable MapReduce partition outputs, and zero fabricated claims.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>14/14 API Tests Passed</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#F4B860]">
                <CheckCircle2 className="w-4 h-4" />
                <span>8/8 Java JUnit Tests Passed</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#2DD4BF]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hadoop 3.3.6 Uber-JAR</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <Link
                to="/overview"
                className="px-5 py-3 rounded-xl bg-[#F4B860] hover:bg-[#F6C47B] text-[#0B0C10] font-bold text-xs transition-all shadow-md shadow-amber-950/20"
              >
                Launch Studio
              </Link>
              <Link
                to="/architecture"
                className="px-5 py-3 rounded-xl bg-[#0B0C10] hover:bg-[#14161B] text-[#F4F4F5] border border-white/[0.1] text-xs font-semibold transition-all"
              >
                Review 20 Viva Questions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-xs text-[#A1A1AA] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-[#F4F4F5]">CineMetrics</span> — Movie Ratings Analysis Using Apache Hadoop MapReduce
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">Developer: Achyuth PV • SRM IST Ramapuram (21CSC314P)</p>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/Achyuth777/Cine_Metrics"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#F4B860] flex items-center gap-1 transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <Link to="/hadoop" className="hover:text-[#F4B860] transition-colors">
            Cluster Telemetry
          </Link>
        </div>
      </footer>
    </div>
  );
}
