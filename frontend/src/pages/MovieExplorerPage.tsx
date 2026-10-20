import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { api } from '../api';
import { MovieSummary, PaginatedMovies } from '../types';
import { LoadingSpinner, ErrorState, EmptyState } from '../components/LoadingState';

export default function MovieExplorerPage() {
  const [moviesData, setMoviesData] = useState<PaginatedMovies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [minCount, setMinCount] = useState<number | ''>(5);
  const [sortBy, setSortBy] = useState<'avgRating' | 'weightedRating' | 'ratingCount' | 'title'>('weightedRating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Movie for Detail Drawer
  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);

  // Genres list for dropdown
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    api.getGenres()
      .then(res => setGenres(res.map(g => g.genre)))
      .catch(err => console.error("Could not fetch genres:", err));
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMovies({
        page,
        pageSize,
        search: search.trim() || undefined,
        genre: selectedGenre || undefined,
        minRating: minRating !== '' ? Number(minRating) : undefined,
        minCount: minCount !== '' ? Number(minCount) : undefined,
        sortBy,
        sortOrder
      });
      setMoviesData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [page, sortBy, sortOrder, selectedGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovies();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedGenre('');
    setMinRating('');
    setMinCount(5);
    setSortBy('weightedRating');
    setSortOrder('desc');
    setPage(1);
  };

  const movieList = moviesData?.movies || (moviesData as any)?.items || [];

  const getMovieGenres = (m: MovieSummary | null): string[] => {
    if (!m) return [];
    if (Array.isArray(m.genreList) && m.genreList.length > 0) return m.genreList;
    if (typeof m.genres === 'string' && m.genres) {
      return m.genres.split('|').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252538]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Movie Intelligence Explorer
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
              9,742 Titles
            </span>
          </h2>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Query individual movie statistics calculated across 100,000+ ratings via MapReduce.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] p-4 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#646a84] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or year (e.g. Matrix, 1999)..."
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d14] border border-[#252538] rounded-lg text-xs text-white placeholder-[#646a84] focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Genre Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#0d0d14] border border-[#252538] rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">All Genres</option>
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Min Rating */}
          <div className="md:col-span-2">
            <input
              type="number"
              step="0.5"
              min="0"
              max="5"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Min Rating (★)"
              className="w-full px-3 py-2 bg-[#0d0d14] border border-[#252538] rounded-lg text-xs text-white placeholder-[#646a84] focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Min Count */}
          <div className="md:col-span-2">
            <input
              type="number"
              min="0"
              value={minCount}
              onChange={(e) => setMinCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Min Votes"
              className="w-full px-3 py-2 bg-[#0d0d14] border border-[#252538] rounded-lg text-xs text-white placeholder-[#646a84] focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/20"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-[#0d0d14] hover:bg-[#1f1f2e] text-[#9aa0b8] border border-[#252538] rounded-lg text-xs transition-colors"
              title="Reset Filters"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Sorting Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#252538]/60 text-xs">
          <span className="text-[#646a84] text-[11px] font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" /> Sort by:
          </span>

          <button
            onClick={() => {
              if (sortBy === 'weightedRating') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('weightedRating'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              sortBy === 'weightedRating'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'text-[#9aa0b8] hover:text-white bg-[#0d0d14]'
            }`}
          >
            Bayesian Weighted {sortBy === 'weightedRating' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'avgRating') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('avgRating'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              sortBy === 'avgRating'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'text-[#9aa0b8] hover:text-white bg-[#0d0d14]'
            }`}
          >
            Average Rating {sortBy === 'avgRating' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'ratingCount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('ratingCount'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              sortBy === 'ratingCount'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'text-[#9aa0b8] hover:text-white bg-[#0d0d14]'
            }`}
          >
            Rating Count {sortBy === 'ratingCount' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'title') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('title'); setSortOrder('asc'); }
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              sortBy === 'title'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'text-[#9aa0b8] hover:text-white bg-[#0d0d14]'
            }`}
          >
            Title {sortBy === 'title' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Movies Table */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Querying MapReduce dataset index..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMovies} />
        ) : !moviesData || movieList.length === 0 ? (
          <EmptyState title="No matching movies found" message="Try lowering the minimum rating or clearing the search query." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#9aa0b8]">
                <thead className="bg-[#0d0d14] text-[11px] uppercase tracking-wider text-[#646a84] border-b border-[#252538]">
                  <tr>
                    <th className="py-3 px-4">Movie Title</th>
                    <th className="py-3 px-3">Year</th>
                    <th className="py-3 px-3">Genres</th>
                    <th className="py-3 px-3 text-right">Raw Avg (★)</th>
                    <th className="py-3 px-3 text-right">Votes</th>
                    <th className="py-3 px-3 text-right">Weighted Score</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252538]">
                  {movieList.map((movie: MovieSummary) => (
                    <tr
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(movie)}
                      className="hover:bg-[#1c1c2e] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                          {movie.title}
                        </div>
                        <div className="text-[10px] text-[#646a84] font-mono">
                          ID: #{movie.movieId}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-white">
                        {movie.year || movie.title?.match(/\((\d{4})\)/)?.[1] || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {getMovieGenres(movie).slice(0, 3).map((g: string) => (
                            <span
                              key={g}
                              className="px-1.5 py-0.5 rounded bg-[#0d0d14] border border-[#252538] text-[10px] text-[#9aa0b8]"
                            >
                              {g}
                            </span>
                          ))}
                          {getMovieGenres(movie).length > 3 && (
                            <span className="text-[10px] text-[#646a84]">
                              +{getMovieGenres(movie).length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                        {movie.avgRating ? movie.avgRating.toFixed(2) : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-violet-300 font-semibold">
                        {movie.ratingCount ? movie.ratingCount.toLocaleString() : 0}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 font-mono font-bold">
                          {movie.weightedRating ? movie.weightedRating.toFixed(3) : '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMovie(movie);
                          }}
                          className="px-2.5 py-1 rounded bg-[#0d0d14] hover:bg-violet-600 hover:text-white text-[#9aa0b8] border border-[#252538] text-[11px] transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d14] border-t border-[#252538] text-xs">
              <span className="text-[#646a84]">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, moviesData.total)} of{' '}
                <strong className="text-white font-mono">{moviesData.total.toLocaleString()}</strong> movies
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-[#161622] border border-[#252538] text-[#9aa0b8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-white text-xs">
                  Page {page} of {moviesData.totalPages}
                </span>
                <button
                  disabled={page >= moviesData.totalPages}
                  onClick={() => setPage(p => Math.min(moviesData.totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-[#161622] border border-[#252538] text-[#9aa0b8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Movie Detail Modal / Drawer */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#161622] border border-[#3b3b58] p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedMovie(null)}
              className="absolute top-4 right-4 text-[#9aa0b8] hover:text-white p-1 rounded-lg hover:bg-[#252538] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div className="pr-6">
                <h3 className="text-base font-bold text-white tracking-tight">{selectedMovie.title}</h3>
                <p className="text-xs text-[#9aa0b8] mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Release Year: {selectedMovie.year || selectedMovie.title?.match(/\((\d{4})\)/)?.[1] || 'Unknown'}</span>
                  <span>•</span>
                  <span>Movie ID: #{selectedMovie.movieId}</span>
                </p>
              </div>
            </div>

            {/* Genres Tag Cloud */}
            <div>
              <p className="text-[11px] font-semibold text-[#646a84] uppercase tracking-wider mb-1.5">
                Genres
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getMovieGenres(selectedMovie).map((g: string) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-md bg-[#0d0d14] border border-[#252538] text-xs text-violet-300 font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#0d0d14] border border-[#252538] text-center">
                <span className="text-[10px] text-[#646a84] uppercase font-semibold block">Raw Avg Rating</span>
                <span className="text-lg font-bold font-mono text-amber-400 mt-1 block">
                  {selectedMovie.avgRating ? selectedMovie.avgRating.toFixed(2) : '—'} ★
                </span>
                <span className="text-[10px] text-[#646a84]">from Job 1</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0d0d14] border border-[#252538] text-center">
                <span className="text-[10px] text-[#646a84] uppercase font-semibold block">Total Votes</span>
                <span className="text-lg font-bold font-mono text-violet-300 mt-1 block">
                  {selectedMovie.ratingCount ? selectedMovie.ratingCount.toLocaleString() : 0}
                </span>
                <span className="text-[10px] text-[#646a84]">from Job 2</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0d0d14] border border-[#252538] text-center">
                <span className="text-[10px] text-[#646a84] uppercase font-semibold block">Bayesian Score</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                  {selectedMovie.weightedRating ? selectedMovie.weightedRating.toFixed(3) : '—'}
                </span>
                <span className="text-[10px] text-[#646a84]">weighted</span>
              </div>
            </div>

            {/* MapReduce Origin Note */}
            <div className="rounded-xl bg-[#0d0d14]/70 border border-[#252538] p-3 text-[11px] text-[#9aa0b8] space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                Hadoop MapReduce Processing Origin:
              </p>
              <p className="text-[10px] text-[#646a84]">
                Rating stats aggregated via <code className="text-violet-300">AverageRatingJob.java</code> (Mapper: movieId → rating, Reducer: sum / count)
                and verified with Bayesian prior damping.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
