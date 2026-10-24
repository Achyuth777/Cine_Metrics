import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Star,
  Film,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  Columns2,
  Info,
  RotateCcw,
  SlidersHorizontal
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
import { MovieSummary, MovieDetail, PaginatedMovies, MovieComparisonResponse } from '../types';
import { LoadingSpinner, ErrorState, EmptyState } from '../components/LoadingState';

export default function MovieExplorerPage() {
  const [moviesData, setMoviesData] = useState<PaginatedMovies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Genre, Year & Threshold State
  const [search, setSearch] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreMode, setGenreMode] = useState<'and' | 'or'>('or');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [minCount, setMinCount] = useState<number | ''>(5);
  const [minYear, setMinYear] = useState<number | ''>('');
  const [maxYear, setMaxYear] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'avgRating' | 'weightedRating' | 'ratingCount' | 'title' | 'year'>('weightedRating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 16;

  // View Mode: Table vs Grid Cards
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Comparison State (2 to 4 movies)
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<MovieComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Detail Drawer State
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Available Genres
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [showGenrePicker, setShowGenrePicker] = useState(false);

  // Abort controller reference for stale-request protection
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.getGenres()
      .then(res => setAllGenres(res.map(g => g.genre)))
      .catch(err => console.error("Could not fetch genres:", err));
  }, []);

  const fetchMovies = (targetPage: number = page) => {
    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    api.getMovies({
      page: targetPage,
      pageSize,
      search: search.trim() || undefined,
      genres: selectedGenres.length > 0 ? selectedGenres.join(',') : undefined,
      genreMode,
      minRating: minRating !== '' ? Number(minRating) : undefined,
      minCount: minCount !== '' ? Number(minCount) : undefined,
      minYear: minYear !== '' ? Number(minYear) : undefined,
      maxYear: maxYear !== '' ? Number(maxYear) : undefined,
      sortBy,
      sortOrder
    }, controller.signal)
      .then((res) => {
        setMoviesData(res);
        setPage(res.page);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err?.message || 'Failed to fetch movies');
        setLoading(false);
      });
  };

  // Re-fetch when sorting, genre, or page changes
  useEffect(() => {
    fetchMovies(page);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [page, sortBy, sortOrder, selectedGenres, genreMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovies(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedGenres([]);
    setGenreMode('or');
    setMinRating('');
    setMinCount(5);
    setMinYear('');
    setMaxYear('');
    setSortBy('weightedRating');
    setSortOrder('desc');
    setPage(1);
    // Directly fetch with clean params
    setTimeout(() => {
      fetchMovies(1);
    }, 0);
  };

  const toggleGenre = (genre: string) => {
    setPage(1);
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleCompareMovie = (movieId: number) => {
    setSelectedForCompare(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      }
      if (prev.length >= 4) {
        alert('You can compare a maximum of 4 movies at a time.');
        return prev;
      }
      return [...prev, movieId];
    });
  };

  const openComparisonModal = () => {
    if (selectedForCompare.length < 2) return;
    setComparisonLoading(true);
    setComparisonModalOpen(true);
    api.compareMovies(selectedForCompare)
      .then(res => {
        setComparisonData(res);
        setComparisonLoading(false);
      })
      .catch(err => {
        alert(err.message || 'Comparison failed');
        setComparisonLoading(false);
      });
  };

  const openMovieDetail = (movieId: number) => {
    setSelectedMovieId(movieId);
    setDetailLoading(true);
    api.getMovie(movieId)
      .then(res => {
        setMovieDetail(res);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error('Failed to load movie detail:', err);
        setDetailLoading(false);
      });
  };

  const movieList = moviesData?.movies || (moviesData as any)?.items || [];
  const totalMovies = moviesData?.total ?? 0;
  const totalPages = moviesData?.totalPages ?? 1;

  // Active filters list for chips
  const activeFilters = [];
  if (search.trim()) activeFilters.push({ label: `Search: "${search}"`, clear: () => { setSearch(''); setPage(1); setTimeout(() => fetchMovies(1), 0); } });
  selectedGenres.forEach(g => {
    activeFilters.push({ label: `Genre: ${g}`, clear: () => toggleGenre(g) });
  });
  if (minRating !== '') activeFilters.push({ label: `Min Rating: ${minRating}★`, clear: () => { setMinRating(''); setPage(1); setTimeout(() => fetchMovies(1), 0); } });
  if (minCount !== '' && minCount !== 5) activeFilters.push({ label: `Min Votes: ${minCount}`, clear: () => { setMinCount(5); setPage(1); setTimeout(() => fetchMovies(1), 0); } });
  if (minYear !== '') activeFilters.push({ label: `Year ≥ ${minYear}`, clear: () => { setMinYear(''); setPage(1); setTimeout(() => fetchMovies(1), 0); } });
  if (maxYear !== '') activeFilters.push({ label: `Year ≤ ${maxYear}`, clear: () => { setMaxYear(''); setPage(1); setTimeout(() => fetchMovies(1), 0); } });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282A30]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Movie Intelligence Explorer
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-mono font-medium">
              {totalMovies.toLocaleString()} Titles
            </span>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Query, filter, and inspect ratings calculated across 100,836 reviews via Apache Hadoop MapReduce.
          </p>
        </div>

        {/* View Switcher & Selection Counter */}
        <div className="flex items-center gap-2">
          {selectedForCompare.length > 0 && (
            <button
              onClick={openComparisonModal}
              disabled={selectedForCompare.length < 2}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-standard ${
                selectedForCompare.length >= 2
                  ? 'bg-[#2DD4BF] text-[#101114] shadow-sm'
                  : 'bg-[#282A30] text-[#A1A1AA] cursor-not-allowed'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Compare ({selectedForCompare.length}/4)</span>
            </button>
          )}

          <div className="flex items-center rounded-lg bg-[#191B20] border border-[#282A30] p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-standard ${
                viewMode === 'table' ? 'bg-[#282A30] text-[#F4F4F5]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-standard ${
                viewMode === 'grid' ? 'bg-[#282A30] text-[#F4F4F5]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
              title="Card grid view"
              aria-label="Card grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Title Search */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complete catalogue (e.g. Matrix, Shawshank)..."
              className="w-full pl-9 pr-4 py-2 bg-[#14161B] border border-[#282A30] rounded-lg text-xs text-[#F4F4F5] placeholder-[#A1A1AA] focus:border-[#F4B860] transition-standard"
            />
          </div>

          {/* Genre Multi-Select Pill */}
          <div className="lg:col-span-3 relative">
            <button
              type="button"
              onClick={() => setShowGenrePicker(!showGenrePicker)}
              className="w-full px-3 py-2 bg-[#14161B] border border-[#282A30] hover:border-[#3A3D46] rounded-lg text-xs text-left flex items-center justify-between text-[#F4F4F5] transition-standard"
            >
              <span className="truncate">
                {selectedGenres.length === 0
                  ? 'All Genres (Any)'
                  : `${selectedGenres.length} Genre${selectedGenres.length > 1 ? 's' : ''} (${genreMode.toUpperCase()})`}
              </span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#A1A1AA]" />
            </button>

            {/* Genre Flyout Picker */}
            {showGenrePicker && (
              <div
                className="absolute left-0 top-11 w-72 rounded-xl bg-[#191B20] border border-[#3A3D46] shadow-2xl p-3 z-40 text-xs animate-fade-in space-y-2"
                onMouseLeave={() => setShowGenrePicker(false)}
              >
                <div className="flex items-center justify-between border-b border-[#282A30] pb-2">
                  <span className="font-semibold text-[#F4F4F5]">Filter by Genre</span>
                  <div className="flex items-center gap-1 bg-[#14161B] rounded p-0.5 border border-[#282A30]">
                    <button
                      type="button"
                      onClick={() => setGenreMode('or')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${genreMode === 'or' ? 'bg-[#F4B860] text-[#101114] font-bold' : 'text-[#A1A1AA]'}`}
                    >
                      OR
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenreMode('and')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${genreMode === 'and' ? 'bg-[#F4B860] text-[#101114] font-bold' : 'text-[#A1A1AA]'}`}
                    >
                      AND
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {allGenres.map(g => (
                    <label
                      key={g}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#21242B] cursor-pointer text-[11px] text-[#D4D4D8]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(g)}
                        onChange={() => toggleGenre(g)}
                        className="rounded border-[#282A30] text-[#F4B860] focus:ring-0"
                      />
                      <span className="truncate">{g}</span>
                    </label>
                  ))}
                </div>

                {selectedGenres.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGenres([])}
                    className="w-full mt-2 py-1 text-center text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5] border-t border-[#282A30]"
                  >
                    Clear Genre Selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Min Rating Threshold */}
          <div className="lg:col-span-1">
            <input
              type="number"
              step="0.5"
              min="0"
              max="5"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Min ★"
              className="w-full px-2.5 py-2 bg-[#14161B] border border-[#282A30] rounded-lg text-xs text-[#F4F4F5] placeholder-[#A1A1AA] focus:border-[#F4B860]"
              title="Minimum average rating"
            />
          </div>

          {/* Min Vote Count */}
          <div className="lg:col-span-1">
            <input
              type="number"
              min="0"
              value={minCount}
              onChange={(e) => setMinCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Min Votes"
              className="w-full px-2.5 py-2 bg-[#14161B] border border-[#282A30] rounded-lg text-xs text-[#F4F4F5] placeholder-[#A1A1AA] focus:border-[#F4B860]"
              title="Minimum rating count threshold"
            />
          </div>

          {/* Year Range */}
          <div className="lg:col-span-1">
            <input
              type="number"
              min="1900"
              max="2025"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Yr From"
              className="w-full px-2 py-2 bg-[#14161B] border border-[#282A30] rounded-lg text-xs text-[#F4F4F5] placeholder-[#A1A1AA] focus:border-[#F4B860]"
              title="Minimum release year"
            />
          </div>

          <div className="lg:col-span-1">
            <input
              type="number"
              min="1900"
              max="2025"
              value={maxYear}
              onChange={(e) => setMaxYear(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Yr To"
              className="w-full px-2 py-2 bg-[#14161B] border border-[#282A30] rounded-lg text-xs text-[#F4F4F5] placeholder-[#A1A1AA] focus:border-[#F4B860]"
              title="Maximum release year"
            />
          </div>

          {/* Search Button & Reset */}
          <div className="lg:col-span-1 flex items-center gap-1.5">
            <button
              type="submit"
              className="flex-1 py-2 bg-[#F4B860] hover:bg-[#F6C47B] text-[#101114] rounded-lg text-xs font-semibold transition-standard flex items-center justify-center gap-1 shadow-sm"
              title="Apply search"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 bg-[#14161B] hover:bg-[#21242B] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#282A30] rounded-lg text-xs transition-standard"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#282A30] text-xs">
            <span className="text-[#A1A1AA] text-[11px] mr-1">Active filters:</span>
            {activeFilters.map((af, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#14161B] border border-[#282A30] text-[#F4F4F5] text-[11px]"
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={af.clear}
                  className="hover:text-[#F4B860] ml-0.5"
                  aria-label={`Remove filter ${af.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-[#F4B860] hover:underline ml-2"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#282A30] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#A1A1AA] text-[11px] font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort by:
            </span>

            {[
              { id: 'weightedRating', label: 'Bayesian Score' },
              { id: 'ratingCount', label: 'Rating Count' },
              { id: 'avgRating', label: 'Audience Mean' },
              { id: 'title', label: 'Title (A-Z)' },
              { id: 'year', label: 'Release Year' }
            ].map(item => {
              const active = sortBy === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (active) {
                      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortBy(item.id as any);
                      setSortOrder(item.id === 'title' ? 'asc' : 'desc');
                    }
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-standard ${
                    active
                      ? 'bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/40 font-semibold'
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5] bg-[#14161B] border border-[#282A30]'
                  }`}
                >
                  {item.label} {active && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-[#A1A1AA] font-mono">
            Showing {movieList.length > 0 ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, totalMovies)} of {totalMovies.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Content: Movies List or Loading/Error */}
      {loading ? (
        <LoadingSpinner text="Retrieving matching movies from MapReduce index..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchMovies(page)} />
      ) : movieList.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="rounded-xl bg-[#191B20] border border-[#282A30] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14161B] text-[#A1A1AA] font-medium border-b border-[#282A30]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3 px-4">Title & Release Year</th>
                  <th className="py-3 px-4">Genres</th>
                  <th className="py-3 px-3 text-right">Rating Volume</th>
                  <th className="py-3 px-3 text-right">Audience Mean</th>
                  <th className="py-3 px-3 text-right">Bayesian (WR)</th>
                  <th className="py-3 px-4 text-center">External</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282A30]/60">
                {movieList.map((movie: MovieSummary) => {
                  const isSelected = selectedForCompare.includes(movie.movieId);
                  return (
                    <tr
                      key={movie.movieId}
                      className={`hover:bg-[#21242B] transition-standard ${
                        isSelected ? 'bg-[#F4B860]/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCompareMovie(movie.movieId)}
                          className="text-[#A1A1AA] hover:text-[#F4B860] transition-colors"
                          title={isSelected ? 'Remove from compare' : 'Add to compare'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#F4B860]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#F4F4F5]">
                        <button
                          onClick={() => openMovieDetail(movie.movieId)}
                          className="hover:text-[#F4B860] text-left transition-colors font-medium"
                        >
                          {movie.title}
                        </button>
                        {movie.year && (
                          <span className="text-[11px] text-[#A1A1AA] ml-1.5 font-mono">
                            ({movie.year})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {movie.genreList.slice(0, 3).map((g: string) => (
                            <span
                              key={g}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#14161B] text-[#D4D4D8] border border-[#282A30]"
                            >
                              {g}
                            </span>
                          ))}
                          {movie.genreList.length > 3 && (
                            <span className="text-[10px] text-[#A1A1AA]">
                              +{movie.genreList.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#F4F4F5] tabular-nums">
                        {movie.ratingCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#F4B860] font-semibold tabular-nums">
                        {movie.avgRating !== null ? `${movie.avgRating.toFixed(2)} ★` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#2DD4BF] font-semibold tabular-nums">
                        {movie.weightedRating !== null ? `${movie.weightedRating.toFixed(2)} ★` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {movie.imdbUrl ? (
                            <a
                              href={movie.imdbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#282A30] hover:bg-[#3A3D46] text-[#F4B860] transition-colors"
                              title="View on IMDb"
                            >
                              IMDb
                            </a>
                          ) : (
                            <span className="text-[10px] text-[#646A84]">—</span>
                          )}
                          {movie.tmdbUrl && (
                            <a
                              href={movie.tmdbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#282A30] hover:bg-[#3A3D46] text-[#2DD4BF] transition-colors"
                              title="View on TMDb"
                            >
                              TMDb
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => openMovieDetail(movie.movieId)}
                          className="px-2.5 py-1 rounded bg-[#14161B] hover:bg-[#282A30] text-[#D4D4D8] hover:text-[#F4F4F5] border border-[#282A30] text-[11px] font-medium transition-standard"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {movieList.map((movie: MovieSummary) => {
            const isSelected = selectedForCompare.includes(movie.movieId);
            return (
              <div
                key={movie.movieId}
                className={`rounded-xl bg-[#191B20] border p-4 flex flex-col justify-between transition-standard ${
                  isSelected ? 'border-[#F4B860] bg-[#F4B860]/5' : 'border-[#282A30] hover:border-[#3A3D46]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#14161B] text-[#2DD4BF] border border-[#282A30]">
                      Bayes {movie.weightedRating?.toFixed(2) ?? '—'} ★
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCompareMovie(movie.movieId)}
                      className="text-[#A1A1AA] hover:text-[#F4B860]"
                      title="Toggle comparison"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#F4B860]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h3
                    onClick={() => openMovieDetail(movie.movieId)}
                    className="text-xs font-semibold text-[#F4F4F5] hover:text-[#F4B860] cursor-pointer line-clamp-2 leading-tight"
                    title={movie.title}
                  >
                    {movie.title}
                  </h3>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {movie.genreList.slice(0, 3).map((g: string) => (
                      <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-[#14161B] text-[#A1A1AA] border border-[#282A30]">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#282A30] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] block">Volume</span>
                    <span className="font-mono font-bold text-[#F4F4F5] tabular-nums">
                      {movie.ratingCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#A1A1AA] block">Mean</span>
                    <span className="font-mono font-bold text-[#F4B860] tabular-nums">
                      {movie.avgRating ? `${movie.avgRating.toFixed(2)} ★` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#282A30]">
          <div className="text-xs text-[#A1A1AA]">
            Page <span className="font-semibold text-[#F4F4F5]">{page}</span> of{' '}
            <span className="font-semibold text-[#F4F4F5]">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#191B20] border border-[#282A30] text-xs font-medium text-[#F4F4F5] hover:bg-[#21242B] disabled:opacity-40 disabled:cursor-not-allowed transition-standard"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {/* Quick jump to page 1 if far */}
            {page > 3 && (
              <button
                onClick={() => setPage(1)}
                className="px-2.5 py-1.5 rounded-lg bg-[#191B20] border border-[#282A30] text-xs font-mono text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                1
              </button>
            )}

            <span className="px-3 py-1.5 rounded-lg bg-[#F4B860] text-[#101114] text-xs font-bold font-mono">
              {page}
            </span>

            {page < totalPages - 2 && (
              <button
                onClick={() => setPage(totalPages)}
                className="px-2.5 py-1.5 rounded-lg bg-[#191B20] border border-[#282A30] text-xs font-mono text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                {totalPages}
              </button>
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#191B20] border border-[#282A30] text-xs font-medium text-[#F4F4F5] hover:bg-[#21242B] disabled:opacity-40 disabled:cursor-not-allowed transition-standard"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Movie Comparison Modal */}
      {comparisonModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setComparisonModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-[#191B20] border border-[#3A3D46] shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#282A30]">
              <div className="flex items-center gap-2">
                <Columns2 className="w-5 h-5 text-[#2DD4BF]" />
                <h2 className="text-lg font-bold text-[#F4F4F5]">
                  Multi-Movie Analytics Comparison
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-mono">
                  {selectedForCompare.length} Movies Selected
                </span>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#21242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {comparisonLoading ? (
              <div className="py-16">
                <LoadingSpinner text="Running side-by-side comparative rating analysis..." />
              </div>
            ) : comparisonData ? (
              <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
                {/* Comparison Summary Banner */}
                <div className="rounded-xl bg-[#14161B] border border-[#282A30] p-4 text-xs text-[#D4D4D8] leading-relaxed">
                  <span className="font-semibold text-[#F4B860] block mb-1">Comparative Insights:</span>
                  {comparisonData.analysisSummary}
                  {comparisonData.commonGenres.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
                      <span>Shared Genres:</span>
                      {comparisonData.commonGenres.map(g => (
                        <span key={g} className="px-1.5 py-0.2 rounded bg-[#282A30] text-[#2DD4BF] font-mono">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side-by-side Movie Cards */}
                <div className={`grid grid-cols-1 md:grid-cols-${comparisonData.movies.length} gap-4`}>
                  {comparisonData.movies.map((m) => {
                    const distEntries = Object.entries(m.ratingDistribution || {}).map(([rating, count]) => ({
                      rating,
                      count
                    }));
                    return (
                      <div
                        key={m.movieId}
                        className="rounded-xl bg-[#14161B] border border-[#282A30] p-4 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm text-[#F4F4F5] line-clamp-2">
                              {m.title}
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] mt-1">{m.genres}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {m.imdbUrl && (
                              <a
                                href={m.imdbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#282A30] text-[#F4B860] hover:bg-[#3A3D46]"
                              >
                                IMDb ↗
                              </a>
                            )}
                            {m.tmdbUrl && (
                              <a
                                href={m.tmdbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#282A30] text-[#2DD4BF] hover:bg-[#3A3D46]"
                              >
                                TMDb ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Metric Columns */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#282A30]">
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Rating Volume</span>
                            <span className="font-mono font-bold text-[#F4F4F5]">
                              {m.ratingCount?.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Audience Mean</span>
                            <span className="font-mono font-bold text-[#F4B860]">
                              {m.avgRating?.toFixed(2)} ★
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Bayesian WR</span>
                            <span className="font-mono font-bold text-[#2DD4BF]">
                              {m.weightedRating?.toFixed(2)} ★
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Volume Rank</span>
                            <span className="font-mono text-[#D4D4D8]">
                              #{m.rankMostRated ?? '—'}
                            </span>
                          </div>
                        </div>

                        {/* Per-movie 0.5-5.0 Star Distribution */}
                        <div className="pt-2 border-t border-[#282A30]">
                          <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-2">
                            Actual Half-Star Breakdown:
                          </span>
                          <div className="h-28 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={distEntries} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <XAxis dataKey="rating" stroke="#646A84" fontSize={9} tickLine={false} />
                                <YAxis stroke="#646A84" fontSize={9} tickLine={false} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#191B20',
                                    border: '1px solid #3A3D46',
                                    fontSize: '11px',
                                    color: '#F4F4F5'
                                  }}
                                  formatter={(val: any) => [`${val} reviews`, 'Count']}
                                />
                                <Bar dataKey="count" fill="#F4B860" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-[#282A30] flex justify-between items-center text-xs">
              <button
                onClick={() => setSelectedForCompare([])}
                className="text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#282A30] hover:bg-[#3A3D46] text-[#F4F4F5] font-semibold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Movie Inspection Drawer */}
      {selectedMovieId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedMovieId(null)}
        >
          <div
            className="w-full max-w-lg h-full bg-[#191B20] border-l border-[#3A3D46] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#282A30]">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#F4B860]" />
                  <span className="text-xs font-mono font-semibold text-[#F4B860] uppercase">
                    Movie Analytics Card
                  </span>
                </div>
                <button
                  onClick={() => setSelectedMovieId(null)}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#21242B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-20">
                  <LoadingSpinner text="Loading detailed rating distribution..." />
                </div>
              ) : movieDetail ? (
                <div className="space-y-6 pt-4">
                  {/* Title & Metadata */}
                  <div>
                    <h2 className="text-xl font-bold text-[#F4F4F5] leading-snug">
                      {movieDetail.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {movieDetail.year && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#14161B] text-[#D4D4D8] border border-[#282A30] font-mono">
                          Year: {movieDetail.year}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-[#14161B] text-[#A1A1AA] border border-[#282A30]">
                        ID: {movieDetail.movieId}
                      </span>
                      {movieDetail.isHiddenGem && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-semibold">
                          Hidden Gem
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Genres */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#A1A1AA] uppercase tracking-wider font-semibold block">
                      Genres
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {movieDetail.genreList.map((g) => (
                        <span
                          key={g}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#14161B] border border-[#282A30] text-[#F4F4F5]"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
                      <span className="text-[#A1A1AA] text-[11px] block">Audience Average</span>
                      <span className="text-xl font-bold font-mono text-[#F4B860]">
                        {movieDetail.avgRating !== null ? `${movieDetail.avgRating.toFixed(2)} ★` : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
                      <span className="text-[#A1A1AA] text-[11px] block">Total Ratings</span>
                      <span className="text-xl font-bold font-mono text-[#F4F4F5]">
                        {movieDetail.ratingCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
                      <span className="text-[#A1A1AA] text-[11px] block">Bayesian Score (WR)</span>
                      <span className="text-xl font-bold font-mono text-[#2DD4BF]">
                        {movieDetail.weightedRating !== null ? `${movieDetail.weightedRating.toFixed(2)} ★` : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#14161B] border border-[#282A30]">
                      <span className="text-[#A1A1AA] text-[11px] block">Volume Ranking</span>
                      <span className="text-xl font-bold font-mono text-[#D4D4D8]">
                        #{movieDetail.rankMostRated ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* Actual Half-Star Rating Distribution */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A1A1AA] uppercase tracking-wider font-semibold">
                        Rating Distribution (0.5 to 5.0)
                      </span>
                      <span className="text-[11px] font-mono text-[#A1A1AA]">
                        From ratings.csv
                      </span>
                    </div>

                    <div className="h-44 w-full p-2 rounded-xl bg-[#14161B] border border-[#282A30]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(movieDetail.ratingDistribution || {}).map(([rating, count]) => ({
                            rating,
                            count
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <XAxis dataKey="rating" stroke="#646A84" fontSize={10} tickLine={false} />
                          <YAxis stroke="#646A84" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#191B20',
                              border: '1px solid #3A3D46',
                              fontSize: '11px',
                              color: '#F4F4F5'
                            }}
                            formatter={(val: any) => [`${val} reviews`, 'Count']}
                          />
                          <Bar dataKey="count" fill="#F4B860" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Viva Voce Bayesian Mathematical Explanation */}
                  {movieDetail.bayesianFormula && (
                    <div className="p-4 rounded-xl bg-[#14161B] border border-[#282A30] text-xs space-y-2">
                      <span className="font-semibold text-[#F4B860] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Viva Voce: Bayesian Shrinkage Formula
                      </span>
                      <div className="font-mono text-[11px] bg-[#101114] p-2.5 rounded-lg border border-[#282A30] text-[#D4D4D8] overflow-x-auto">
                        WR = (v / (v + m)) * R + (m / (v + m)) * C
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] space-y-1">
                        <div>
                          • <strong className="text-[#F4F4F5]">v (Votes):</strong> {movieDetail.bayesianFormula.v}
                        </div>
                        <div>
                          • <strong className="text-[#F4F4F5]">m (Prior Weight):</strong> {movieDetail.bayesianFormula.m}
                        </div>
                        <div>
                          • <strong className="text-[#F4F4F5]">R (Movie Avg):</strong> {movieDetail.bayesianFormula.R?.toFixed(2)}
                        </div>
                        <div>
                          • <strong className="text-[#F4F4F5]">C (Global Mean):</strong> {movieDetail.bayesianFormula.C?.toFixed(2)}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#A1A1AA] pt-1 border-t border-[#282A30] leading-relaxed">
                        Prevents movies with only 1 or 2 perfect reviews from unfairly outranking established cinema classics with hundreds of ratings.
                      </p>
                    </div>
                  )}

                  {/* External Links */}
                  <div className="flex items-center gap-3 pt-2">
                    {movieDetail.imdbUrl && (
                      <a
                        href={movieDetail.imdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#282A30] hover:bg-[#3A3D46] text-[#F4B860] font-semibold text-xs transition-standard"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        IMDb Title Page
                      </a>
                    )}
                    {movieDetail.tmdbUrl && (
                      <a
                        href={movieDetail.tmdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#282A30] hover:bg-[#3A3D46] text-[#2DD4BF] font-semibold text-xs transition-standard"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TheMovieDB Page
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-[#282A30]">
              <button
                onClick={() => setSelectedMovieId(null)}
                className="w-full py-2 rounded-lg bg-[#282A30] hover:bg-[#3A3D46] text-[#F4F4F5] text-xs font-semibold transition-standard"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
