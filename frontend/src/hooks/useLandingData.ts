import { api } from '../api';
import {
  DEMO_RECORDED_ON,
  demoFewRatings,
  demoFigures,
  demoTopAdjusted,
  type LandingFigures,
  type LandingFilm
} from '../demo/landingDemo';
import { useQuery } from './useQuery';

export type LandingData = {
  /** live: read from the API just now. demo: the recorded sample, because the API did not answer. */
  source: 'live' | 'demo';
  /** Set only for demo data: the date the sample was recorded. */
  recordedOn?: string;
  figures: LandingFigures;
  /** The five films with the highest adjusted score, using the Explorer's default filters. */
  topAdjusted: LandingFilm[];
  /** A film with a top average from very few ratings, to set against the leader. */
  fewRatings: LandingFilm | null;
};

const DEMO: LandingData = {
  source: 'demo',
  recordedOn: DEMO_RECORDED_ON,
  figures: demoFigures,
  topAdjusted: demoTopAdjusted,
  fewRatings: demoFewRatings
};

async function loadLive(signal: AbortSignal): Promise<LandingData> {
  const [overview, top, highestAverage] = await Promise.all([
    api.getOverview(),
    api.getMovies({ sortBy: 'weightedRating', sortOrder: 'desc', pageSize: 5, minCount: 5 }, signal),
    api.getMovies({ sortBy: 'avgRating', sortOrder: 'desc', pageSize: 10 }, signal)
  ]);
  // Among the highest averages, the one resting on the fewest ratings makes the clearest contrast.
  const fewRatings = [...highestAverage.movies].sort((a, b) => a.ratingCount - b.ratingCount)[0] ?? null;
  return { source: 'live', figures: overview, topAdjusted: top.movies, fewRatings };
}

/**
 * Everything the landing page shows from data. It prefers the live API. If the
 * API does not answer, it returns the recorded sample marked `source: 'demo'`,
 * and the page labels it "Demo data" wherever it appears.
 */
export function useLandingData(): { status: 'loading' } | { status: 'ready'; data: LandingData } {
  const query = useQuery('landing', loadLive);
  if (query.status === 'ready') return { status: 'ready', data: query.data };
  if (query.status === 'error') return { status: 'ready', data: DEMO };
  return { status: 'loading' };
}
