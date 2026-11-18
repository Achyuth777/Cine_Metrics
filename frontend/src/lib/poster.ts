// Generated poster art: one picture per film, drawn only from that film's data.
// The picture is a night sky over water.
//
//   lights            one per rating the film has: a speck in the sky, or a
//                     glint on the water when it falls below the line
//   the disc          sits at the height of the film's average rating
//   the amber line    the horizon, at the height of its adjusted (Bayesian) score
//   rules in the water one faint rule for each whole star the adjusted score clears
//   the sky's tint    the film's most specific genre; the ground under the
//                     title takes its second
//
// So a film with a handful of ratings shows a near-empty sky and a disc hanging
// well clear of the horizon, and a film with hundreds shows a picture full of
// light and a disc resting on the horizon. Where the lights fall and where the
// disc sits across the poster are seeded by the film's id, which makes every
// poster different and the same film's poster identical on every visit.
//
// This file has no dependency on React or the DOM.

export type PosterFilm = {
  movieId: number;
  title: string;
  year: number | null;
  genres: string[];
  avgRating: number | null;
  ratingCount: number;
  /** The adjusted score as the API returns it (`weightedRating`). */
  adjusted: number | null;
};

/** The poster is drawn in a 200 by 300 box (2:3, the proportion of a cinema one-sheet). */
export const POSTER = { width: 200, height: 300 };

// Ratings run from 0.5 to 5. They map onto the picture area: 5 near the top, 0.5 just above the title.
const SCORE_MIN = 0.5;
const SCORE_MAX = 5;
const Y_TOP = 28;
const Y_BOTTOM = 168;
const DISC_RADIUS = 21;
/** More lights than this would not add anything the eye can count. The dataset's busiest film has 329 ratings. */
export const MAX_LIGHTS = 400;

/**
 * Genres from most to least specific, by how many films carry each in this
 * dataset (Film-Noir 87 … Drama 4,361; counted from data/raw/movies.csv). A
 * poster takes its tint from the film's most specific genre, so "Crime, Drama"
 * reads as a crime film. IMAX is a format, not a genre, so it comes last.
 */
const SPECIFICITY = [
  'Film-Noir', 'Western', 'Musical', 'War', 'Documentary', 'Mystery', 'Animation', 'Children', 'Fantasy', 'Horror',
  'Sci-Fi', 'Crime', 'Adventure', 'Romance', 'Action', 'Thriller', 'Comedy', 'Drama', 'IMAX'
];

/**
 * One hue per genre, as an OKLCH hue angle. `chroma` scales the shared chroma
 * for genres that should sit closer to grey. All tints share the same lightness
 * steps, so they read as one family beside the amber accent.
 */
export const GENRE_TINT: Record<string, { hue: number; chroma?: number }> = {
  Romance: { hue: 0 },
  Horror: { hue: 20, chroma: 1.15 },
  Action: { hue: 40 },
  Western: { hue: 58 },
  Drama: { hue: 75 },
  Comedy: { hue: 95 },
  War: { hue: 115, chroma: 0.75 },
  Children: { hue: 138 },
  Adventure: { hue: 160 },
  Animation: { hue: 180 },
  'Sci-Fi': { hue: 202 },
  Documentary: { hue: 222, chroma: 0.6 },
  Thriller: { hue: 242 },
  IMAX: { hue: 262 },
  Crime: { hue: 280 },
  Mystery: { hue: 300 },
  Fantasy: { hue: 322 },
  Musical: { hue: 345 },
  'Film-Noir': { hue: 260, chroma: 0.12 }
};
const NO_GENRE_TINT = { hue: 80, chroma: 0.2 };
const BASE_CHROMA = 0.062;

/** Lightness of each part of the picture; the same for every genre. */
export const POSTER_LIGHTNESS = { skyTop: 0.19, skyGlow: 0.4, waterNear: 0.27, waterDeep: 0.16, ground: 0.15 };

export type PosterPalette = {
  /** Top of the sky. */
  skyTop: string;
  /** The sky where it meets the horizon. */
  skyGlow: string;
  /** The water just under the horizon. */
  waterNear: string;
  /** The water further down. */
  waterDeep: string;
  /** Behind the title. */
  ground: string;
};

const oklch = (lightness: number, chroma: number, hue: number) => `oklch(${lightness} ${chroma.toFixed(4)} ${hue})`;

/** The film's genres, most specific first. Labels the palette does not know are left out. */
export function genresBySpecificity(genres: string[]): string[] {
  const known = genres.filter((genre) => genre in GENRE_TINT);
  return [...known].sort((a, b) => SPECIFICITY.indexOf(a) - SPECIFICITY.indexOf(b));
}

export function posterPalette(genres: string[]): PosterPalette {
  const ordered = genresBySpecificity(genres);
  const key = GENRE_TINT[ordered[0]] ?? NO_GENRE_TINT;
  const second = GENRE_TINT[ordered[1]] ?? key;
  const chroma = BASE_CHROMA * (key.chroma ?? 1);
  return {
    skyTop: oklch(POSTER_LIGHTNESS.skyTop, chroma * 0.7, key.hue),
    skyGlow: oklch(POSTER_LIGHTNESS.skyGlow, chroma, key.hue),
    waterNear: oklch(POSTER_LIGHTNESS.waterNear, chroma * 0.85, key.hue),
    waterDeep: oklch(POSTER_LIGHTNESS.waterDeep, chroma * 0.6, key.hue),
    ground: oklch(POSTER_LIGHTNESS.ground, BASE_CHROMA * (second.chroma ?? 1) * 0.5, second.hue)
  };
}

const TRAILING_YEAR = /\s*\(\d{4}\)\s*$/;
const TRAILING_BRACKETS = /\s*\([^()]*\)\s*$/;
// The articles MovieLens moves to the end of a title, as found in this dataset.
const TRAILING_ARTICLE = /^(.*), (The|A|An|Le|La|Les|El|Il|Das|Der|L')$/;

/**
 * The title as a poster would set it. MovieLens stores "Shawshank Redemption,
 * The (1994)" and appends alternate titles in brackets; the poster shows
 * "The Shawshank Redemption". Lists and tables keep the dataset's own form.
 */
export function posterTitle(raw: string): string {
  let title = raw.replace(TRAILING_YEAR, '').trim();
  for (;;) {
    const shorter = title.replace(TRAILING_BRACKETS, '').trim();
    if (shorter === title || shorter === '') break;
    title = shorter;
  }
  const article = title.match(TRAILING_ARTICLE);
  if (!article) return title;
  return article[2].endsWith("'") ? `${article[2]}${article[1]}` : `${article[2]} ${article[1]}`;
}

/** A small deterministic random-number generator (mulberry32), so a film's poster never changes. */
function seeded(seed: number): () => number {
  let state = (Math.imul(seed, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where a score sits on the poster, top to bottom. */
export const scoreY = (score: number): number => {
  const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
  return Y_BOTTOM - ((clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * (Y_BOTTOM - Y_TOP);
};

export type PosterArt = {
  palette: PosterPalette;
  title: string;
  /** Up to two genres, most specific first, for the line under the title. */
  billing: string[];
  /** Null when the film has no ratings: the picture is then an empty sky. */
  rated: null | {
    /** Height of the horizon: the adjusted score. */
    lineY: number;
    disc: { cx: number; cy: number; r: number };
    /** Path of the part of the disc above the horizon, or null when all of it is below. */
    discAbove: string | null;
    /** Lights above the horizon as SVG path data, in three sizes from small to large. */
    sky: [string, string, string];
    /** Lights below the horizon: short glints, in two sizes. */
    water: [string, string];
    /** How many lights were drawn: the rating count, up to MAX_LIGHTS. */
    lightCount: number;
    /** Heights of the whole-star rules in the water: one per whole star below the adjusted score. */
    levels: number[];
    /** Strokes of light on the water under the disc; empty when the disc is below the horizon. */
    reflection: { x1: number; x2: number; y: number; opacity: number }[];
  };
};

const round = (value: number) => Math.round(value * 10) / 10;

export function buildPoster(film: PosterFilm): PosterArt {
  const palette = posterPalette(film.genres);
  const title = posterTitle(film.title);
  const billing = genresBySpecificity(film.genres).slice(0, 2);
  if (film.avgRating === null || film.adjusted === null || film.ratingCount <= 0) {
    return { palette, title, billing, rated: null };
  }

  const random = seeded(film.movieId);
  const lineY = round(scoreY(film.adjusted));
  const cx = round(POSTER.width * (0.24 + random() * 0.52));
  const cy = round(scoreY(film.avgRating));
  const r = DISC_RADIUS;

  // The part of the disc above the horizon is drawn solid; the rest stays faint.
  let discAbove: string | null = null;
  if (lineY >= cy + r) {
    discAbove = `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
  } else if (lineY > cy - r) {
    const half = round(Math.sqrt(r * r - (lineY - cy) ** 2));
    discAbove = `M${round(cx - half)} ${lineY}A${r} ${r} 0 ${lineY > cy ? 1 : 0} 1 ${round(cx + half)} ${lineY}Z`;
  }

  // One light per rating, anywhere in the picture. Above the horizon it is a
  // speck; below, a short glint on the water.
  const lightCount = Math.min(film.ratingCount, MAX_LIGHTS);
  const sky: [string, string, string] = ['', '', ''];
  const water: [string, string] = ['', ''];
  for (let index = 0; index < lightCount; index += 1) {
    const x = round(5 + random() * (POSTER.width - 10));
    const y = round(5 + random() * (Y_BOTTOM + 4));
    const pick = random();
    if (y < lineY - 1) {
      sky[pick < 0.6 ? 0 : pick < 0.9 ? 1 : 2] += `M${x} ${y}h0`;
    } else if (y > lineY + 2) {
      // Glints vary in length, like light broken up by small waves.
      const length = round(1.1 + pick * 3.4);
      water[pick > 0.7 ? 1 : 0] += `M${round(x - length / 2)} ${y}h${length}`;
    } else {
      // On the horizon itself a light would hide behind the line, so it goes just above it.
      sky[0] += `M${x} ${round(lineY - 2)}h0`;
    }
  }

  const levels: number[] = [];
  for (let star = Math.ceil(SCORE_MIN); star < film.adjusted && star < SCORE_MAX; star += 1) {
    const y = round(scoreY(star));
    if (y > lineY + 4) levels.push(y);
  }

  const reflection: NonNullable<PosterArt['rated']>['reflection'] = [];
  if (cy - r < lineY) {
    const steps = 7;
    for (let index = 0; index < steps; index += 1) {
      const t = index / (steps - 1);
      const width = 34 - t * 26 + (random() - 0.5) * 5;
      const drift = (random() - 0.5) * (4 + t * 6);
      reflection.push({
        x1: round(cx - width / 2 + drift),
        x2: round(cx + width / 2 + drift),
        y: round(lineY + 5 + t * t * 44 + index * 3.2),
        opacity: round(0.42 - t * 0.32)
      });
    }
  }

  return {
    palette,
    title,
    billing,
    rated: { lineY, disc: { cx, cy, r }, discAbove, sky, water, lightCount, levels, reflection }
  };
}

/** Title size steps: short titles are set large, long ones smaller, so both fill the title area. */
export function titleScale(title: string): 'xl' | 'lg' | 'md' | 'sm' {
  if (title.length <= 12) return 'xl';
  if (title.length <= 24) return 'lg';
  if (title.length <= 42) return 'md';
  return 'sm';
}
