// DEMO DATA for the landing page only.
//
// The landing page shows this when the API can't be reached, and always under a
// visible "Demo data" label. Every value was copied from the running API on the
// date below (MovieLens latest-small); none is invented. Nothing in the studio
// routes imports this module: they show live data or an error.

import type { MovieSummary, OverviewData } from '../types';

export type LandingFilm = Pick<
  MovieSummary,
  'movieId' | 'title' | 'year' | 'genres' | 'avgRating' | 'ratingCount' | 'weightedRating'
>;

export type LandingFigures = Pick<
  OverviewData,
  'totalRatings' | 'totalMovies' | 'uniqueUsers' | 'globalAverageRating' | 'genreCount'
>;

/** When these values were recorded (ISO date). */
export const DEMO_RECORDED_ON = '2026-11-14';

export const demoFigures: LandingFigures = {
  totalRatings: 100836,
  totalMovies: 9742,
  uniqueUsers: 610,
  globalAverageRating: 3.5016,
  genreCount: 19
};

/** GET /api/movies?sortBy=weightedRating&sortOrder=desc&pageSize=5&minCount=5 */
export const demoTopAdjusted: LandingFilm[] = [
  { movieId: 318, title: 'Shawshank Redemption, The (1994)', year: 1994, genres: 'Crime|Drama', avgRating: 4.429, ratingCount: 317, weightedRating: 4.4006 },
  { movieId: 858, title: 'Godfather, The (1972)', year: 1972, genres: 'Crime|Drama', avgRating: 4.2891, ratingCount: 192, weightedRating: 4.2501 },
  { movieId: 2959, title: 'Fight Club (1999)', year: 1999, genres: 'Action|Crime|Drama|Thriller', avgRating: 4.2729, ratingCount: 218, weightedRating: 4.2391 },
  { movieId: 1221, title: 'Godfather: Part II, The (1974)', year: 1974, genres: 'Crime|Drama', avgRating: 4.2597, ratingCount: 129, weightedRating: 4.2052 },
  { movieId: 50, title: 'Usual Suspects, The (1995)', year: 1995, genres: 'Crime|Mystery|Thriller', avgRating: 4.2377, ratingCount: 204, weightedRating: 4.2033 }
];

/** The first film with a single rating in GET /api/movies?sortBy=avgRating&sortOrder=desc&pageSize=10 */
export const demoFewRatings: LandingFilm = {
  movieId: 148,
  title: 'Awfully Big Adventure, An (1995)',
  year: 1995,
  genres: 'Drama',
  avgRating: 5.0,
  ratingCount: 1,
  weightedRating: 3.6378
};
