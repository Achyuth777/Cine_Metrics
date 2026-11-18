import { api } from '../api';
import type { ConstellationFilm } from '../lib/constellation';
import { DEFAULT_MIN_COUNT } from '../lib/explorerParams';
import { useQuery } from './useQuery';

// The API returns at most 100 films per page, so the chart reads five pages.
const PAGE_SIZE = 100;
const PAGES = 5;

export type ConstellationData = {
  /** live: read from the API just now. demo: the recorded sample, because the API did not answer. */
  source: 'live' | 'demo';
  /** Set only for demo data: the ISO date the sample was recorded. */
  recordedOn?: string;
  /** The dataset's mean rating, as the API reports it. */
  mean: number;
  /** The films with the highest adjusted scores, using the Explorer's default filter. */
  films: ConstellationFilm[];
};

type DemoRow = [number, string, number | null, number, number, number];

async function loadLive(signal: AbortSignal): Promise<ConstellationData> {
  const [overview, ...pages] = await Promise.all([
    api.getOverview(),
    ...Array.from({ length: PAGES }, (_, index) =>
      api.getMovies(
        { sortBy: 'weightedRating', sortOrder: 'desc', pageSize: PAGE_SIZE, minCount: DEFAULT_MIN_COUNT, page: index + 1 },
        signal
      )
    )
  ]);
  const films: ConstellationFilm[] = [];
  for (const film of pages.flatMap((page) => page.movies)) {
    if (film.avgRating === null || film.weightedRating === null) continue;
    films.push({
      movieId: film.movieId,
      title: film.title,
      year: film.year,
      avgRating: film.avgRating,
      ratingCount: film.ratingCount,
      adjusted: film.weightedRating
    });
  }
  if (films.length === 0) throw new Error('The API returned no films');
  return { source: 'live', mean: overview.globalAverageRating, films };
}

/** The recorded sample. It loads only when the API can't be reached, so it costs nothing otherwise. */
async function loadDemo(): Promise<ConstellationData> {
  const demo = (await import('../demo/constellationDemo.json')).default;
  return {
    source: 'demo',
    recordedOn: demo.recordedOn,
    mean: demo.mean,
    films: (demo.films as DemoRow[]).map(([movieId, title, year, avgRating, ratingCount, adjusted]) => ({
      movieId,
      title,
      year,
      avgRating,
      ratingCount,
      adjusted
    }))
  };
}

/**
 * The films the constellation plots. Live from the API when it answers. Otherwise
 * the recorded sample, marked `source: 'demo'` so the chart can label it "Demo data".
 */
export function useConstellationData() {
  return useQuery('constellation', (signal) =>
    loadLive(signal).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      return loadDemo();
    })
  );
}
