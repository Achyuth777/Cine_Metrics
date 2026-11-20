import { api } from '../api';
import type { PullFilm } from '../lib/bayesPull';
import { useQuery } from './useQuery';

/**
 * Films for the Bayesian pull chart, from the stored snapshot through the API:
 * the 200 most rated, plus the 100 highest and 100 lowest averages (mostly films
 * with very few ratings, where the pull is largest), plus the top 100 adjusted
 * scores. No demo fallback: a failed request is shown as an error.
 */
export function useBayesPullData() {
  return useQuery('bayes-pull', async (signal) => {
    const page = (sortBy: 'ratingCount' | 'avgRating' | 'weightedRating', sortOrder: 'asc' | 'desc', number = 1) =>
      api.getMovies({ sortBy, sortOrder, pageSize: 100, minCount: 1, page: number }, signal);
    const [overview, ...pages] = await Promise.all([
      api.getOverview(),
      page('ratingCount', 'desc', 1),
      page('ratingCount', 'desc', 2),
      page('avgRating', 'desc'),
      page('avgRating', 'asc'),
      page('weightedRating', 'desc')
    ]);
    const films = new Map<number, PullFilm>();
    for (const film of pages.flatMap((result) => result.movies)) {
      if (film.avgRating === null || film.weightedRating === null || film.ratingCount < 1) continue;
      films.set(film.movieId, {
        movieId: film.movieId,
        title: film.title,
        year: film.year,
        avgRating: film.avgRating,
        ratingCount: film.ratingCount,
        adjusted: film.weightedRating
      });
    }
    if (films.size === 0) throw new Error('The API returned no films');
    return { mean: overview.globalAverageRating, films: [...films.values()] };
  });
}
