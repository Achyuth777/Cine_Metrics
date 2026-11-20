// The "Bayesian pull" surface on /ratings.
//
// The adjusted score as the backend computes it (backend/data_loader.py,
// _compute_weighted_rating):
//
//   WR = (v / (v + m)) * R + (m / (v + m)) * C
//
//   v = the film's rating count       R = the film's average rating
//   m = prior weight, 10 in the app   C = mean of every rating in the dataset
//
// The chart draws WR for every combination of rating count (across, log scale)
// and average rating (depth) as a surface, and places real films on it. Each
// film has a thin line from the height of its plain average to the height of
// its adjusted score: that line is the pull toward C.
//
// With m = 10 the films' heights are the adjusted scores the API returned.
// Any other m is an educational simulation computed here with the same formula,
// and the chart says so.
//
// Uses the constellation's box, camera and projector, so both 3D charts read alike.

import { BOX, type AxisLabel, type Vec3 } from './constellation';

/** The prior weight the backend uses (backend/data_loader.py, min_votes=10). */
export const PRIOR_WEIGHT = 10;

const SCORE: [number, number] = [0.5, 5];
const ROWS = 19; // averages 0.5, 0.75 … 5
const COLUMNS = 32;

export function adjustedScore(count: number, average: number, m: number, mean: number): number {
  return (count / (count + m)) * average + (m / (count + m)) * mean;
}

export type PullFilm = {
  movieId: number;
  title: string;
  year: number | null;
  avgRating: number;
  ratingCount: number;
  /** The adjusted score as the API returned it (`weightedRating`, m = 10). */
  adjusted: number;
};

export type PullPoint = PullFilm & {
  /** The height shown: the API's score at m = 10, otherwise the simulated one. */
  score: number;
  position: Vec3;
  /** Height of the plain average. */
  rawY: number;
  radius: number;
  /** Average minus the score shown. Negative when the film is pulled up. */
  pull: number;
};

export type PullModel = {
  points: PullPoint[];
  /** The surface: ROWS rows of COLUMNS positions, one row per average rating. */
  rows: Vec3[][];
  labels: AxisLabel[];
  m: number;
  mean: number;
  simulated: boolean;
  maxCount: number;
};

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const unit = (value: number, [min, max]: [number, number]) => (value - min) / (max - min);

export function buildPull(films: PullFilm[], mean: number, m: number, compact = false): PullModel {
  const maxCount = Math.max(10, ...films.map((film) => film.ratingCount));
  const logMax = Math.log10(maxCount);
  const xOf = (count: number) => lerp(-BOX.halfWidth, BOX.halfWidth, Math.log10(Math.max(1, count)) / logMax);
  const zOf = (average: number) => lerp(BOX.halfDepth, -BOX.halfDepth, unit(average, SCORE));
  const yOf = (score: number) => lerp(0, BOX.height, unit(score, SCORE));
  const simulated = m !== PRIOR_WEIGHT;

  const rows: Vec3[][] = [];
  for (let row = 0; row < ROWS; row += 1) {
    const average = SCORE[0] + ((SCORE[1] - SCORE[0]) * row) / (ROWS - 1);
    const line: Vec3[] = [];
    for (let column = 0; column < COLUMNS; column += 1) {
      const count = 10 ** ((logMax * column) / (COLUMNS - 1));
      line.push([xOf(count), yOf(adjustedScore(count, average, m, mean)), zOf(average)]);
    }
    rows.push(line);
  }

  const points = [...films]
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .map((film): PullPoint => {
      const score = simulated ? adjustedScore(film.ratingCount, film.avgRating, m, mean) : film.adjusted;
      return {
        ...film,
        score,
        position: [xOf(film.ratingCount), yOf(score), zOf(film.avgRating)],
        rawY: yOf(film.avgRating),
        radius: lerp(0.035, 0.075, Math.sqrt(Math.log10(Math.max(1, film.ratingCount)) / logMax)),
        pull: film.avgRating - score
      };
    });

  const every = <T,>(items: T[]) => (compact ? items.filter((_, index) => index % 2 === 0) : items);
  const countTicks = [1, 10, 100, 1000].filter((value) => value <= maxCount);
  const labels: AxisLabel[] = [
    ...countTicks.map((value): AxisLabel => ({ text: String(value), position: [xOf(value), 0, BOX.halfDepth], side: 'below' })),
    { text: 'Ratings, log scale', position: [0, 0, BOX.halfDepth], side: 'below', title: true },
    ...every([1, 2, 3, 4, 5]).map((value): AxisLabel => ({ text: value.toFixed(1), position: [BOX.halfWidth, 0, zOf(value)], side: 'right' })),
    { text: 'Average rating', position: [BOX.halfWidth, 0, -BOX.halfDepth], side: 'right', title: true },
    ...[1, 2, 3, 4, 5].map((value): AxisLabel => ({ text: value.toFixed(1), position: [-BOX.halfWidth, yOf(value), -BOX.halfDepth], side: 'left' })),
    { text: 'Adjusted score', position: [-BOX.halfWidth, BOX.height, -BOX.halfDepth], side: 'above', title: true }
  ];

  return { points, rows, labels, m, mean, simulated, maxCount };
}

/** The floor outline at score 0.5. */
export function floorCorners(): Vec3[] {
  const { halfWidth: w, halfDepth: d } = BOX;
  return [
    [-w, 0, -d],
    [w, 0, -d],
    [w, 0, d],
    [-w, 0, d]
  ];
}
