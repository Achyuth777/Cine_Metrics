// Optional real posters from TMDB (The Movie Database).
//
// Off unless the dev or preview server was started with a TMDB_API_KEY in its
// environment (see vite.config.ts). The key stays in that server process: the
// browser asks this site's own /tmdb/movie/<id> path, and the server adds the
// key when it forwards the request. Without a key nothing here makes a request
// and every film keeps its generated poster.
//
// TMDB's terms require attribution wherever its images are shown; the Explorer
// prints TMDB_NOTICE under the grid whenever this is switched on.

/** True when this build or dev server has a TMDB key to use. The key itself is never in the bundle. */
export const TMDB_ENABLED: boolean = typeof __TMDB_POSTERS__ !== 'undefined' && __TMDB_POSTERS__;

export const TMDB_NOTICE = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type TmdbPoster = { src: string; srcSet: string };

const lookups = new Map<string, Promise<TmdbPoster | null>>();

async function lookUp(tmdbId: string): Promise<TmdbPoster | null> {
  try {
    const response = await fetch(`/tmdb/movie/${tmdbId}`, { headers: { Accept: 'application/json' } });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return null;
    const body: { poster_path?: unknown } = await response.json();
    const path = body.poster_path;
    if (typeof path !== 'string' || !/^\/[\w.-]+$/.test(path)) return null;
    return {
      src: `${IMAGE_BASE}/w342${path}`,
      srcSet: `${IMAGE_BASE}/w342${path} 342w, ${IMAGE_BASE}/w500${path} 500w, ${IMAGE_BASE}/w780${path} 780w`
    };
  } catch {
    return null;
  }
}

/**
 * The film's TMDB poster, or null when TMDB is off, the film has no TMDB id,
 * or TMDB has no poster for it. Each film is looked up once per page load.
 */
export function tmdbPoster(tmdbId: string | null | undefined): Promise<TmdbPoster | null> {
  if (!TMDB_ENABLED || !tmdbId || !/^\d+$/.test(tmdbId)) return Promise.resolve(null);
  let lookup = lookups.get(tmdbId);
  if (!lookup) {
    lookup = lookUp(tmdbId);
    lookups.set(tmdbId, lookup);
  }
  return lookup;
}
