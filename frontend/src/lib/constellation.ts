// The "Ratings constellation": one model, two renderers.
//
// Each film is a point in a box:
//   across (x) = its average rating
//   depth  (z) = how many ratings it has, on a log scale (few at the back, many in front)
//   height (y) = its adjusted (Bayesian) score
// A thin vertical line runs from the height the film would have at its plain
// average down to its adjusted height. That line is the Bayesian pull toward the
// dataset mean, which is the floor of the box.
//
// This file has no dependency on three.js. The WebGL scene and the static SVG
// both read the same positions and the same camera, so the SVG is a true still
// of the 3D chart.

export type ConstellationFilm = {
  movieId: number;
  title: string;
  year: number | null;
  avgRating: number;
  ratingCount: number;
  /** The adjusted score as the API returns it (`weightedRating`). */
  adjusted: number;
};

export type Vec3 = [number, number, number];

export type ConstellationPoint = ConstellationFilm & {
  /** Rank by adjusted score within the plotted films, starting at 1. */
  rank: number;
  /** Where the film sits: at the height of its adjusted score. */
  position: Vec3;
  /** The height it would have at its plain average, before adjustment. */
  rawY: number;
  /** Sphere radius in scene units, larger with more ratings. */
  radius: number;
  /** 0 to 1 by adjusted score within the plotted films; drives brightness. */
  glow: number;
  /** Average minus adjusted score, in stars. */
  pull: number;
};

export type AxisTick = { value: number; position: Vec3 };

/** A text label anchored to a point in the scene. `side` is where the text sits relative to that point. */
export type AxisLabel = {
  text: string;
  position: Vec3;
  side: 'below' | 'right' | 'left' | 'above';
  /** Axis names are set a little further out than tick values. */
  title?: boolean;
};

export type ConstellationModel = {
  points: ConstellationPoint[];
  /** The dataset's mean rating: the prior the scores are pulled toward. */
  mean: number;
  /** Height of the floor, which is the dataset mean. */
  floorY: number;
  domain: { average: [number, number]; count: [number, number]; score: [number, number] };
  ticks: { average: AxisTick[]; count: AxisTick[]; score: AxisTick[] };
  labels: AxisLabel[];
};

/** Half-extents of the box the points live in, in scene units. */
export const BOX = { halfWidth: 5, height: 7, halfDepth: 3 };

/** One camera for both renderers. `fov` is vertical, in degrees. */
export const CAMERA: { position: Vec3; target: Vec3; fov: number } = {
  position: [10.4, 5.2, 17.2],
  target: [0.4, 2.45, 0],
  fov: 30
};

/** Width over height of the chart area. Both renderers use it, so their framing matches. */
export const CHART_ASPECT = 4 / 3;

const SCORE_TOP = 5;
const COUNT_TICKS = [5, 10, 20, 50, 100, 200, 500, 1000];

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const unit = (value: number, [min, max]: [number, number]) => (max === min ? 0.5 : (value - min) / (max - min));

/**
 * Lay the films out in the box. `mean` is the dataset mean the API reports.
 * `compact` thins the axis labels for narrow screens.
 */
export function buildConstellation(films: ConstellationFilm[], mean: number, compact = false): ConstellationModel {
  const averages = films.map((film) => film.avgRating);
  const counts = films.map((film) => film.ratingCount);
  const scores = films.map((film) => film.adjusted);

  const average: [number, number] = [Math.floor(Math.min(...averages, SCORE_TOP) * 5) / 5, SCORE_TOP];
  const count: [number, number] = [Math.max(1, Math.min(...counts)), Math.max(...counts, 2)];
  const score: [number, number] = [Math.min(...scores), Math.max(...scores)];
  const scoreFloor = Math.min(mean, score[0]);
  const logCount: [number, number] = [Math.log10(count[0]), Math.log10(count[1])];

  const xOf = (value: number) => lerp(-BOX.halfWidth, BOX.halfWidth, unit(value, average));
  const yOf = (value: number) => lerp(0, BOX.height, unit(value, [scoreFloor, SCORE_TOP]));
  const zOf = (value: number) => lerp(-BOX.halfDepth, BOX.halfDepth, unit(Math.log10(Math.max(1, value)), logCount));

  const points = [...films]
    .sort((a, b) => b.adjusted - a.adjusted)
    .map((film, index): ConstellationPoint => ({
      ...film,
      rank: index + 1,
      position: [xOf(film.avgRating), yOf(film.adjusted), zOf(film.ratingCount)],
      rawY: yOf(film.avgRating),
      radius: lerp(0.045, 0.17, Math.sqrt(unit(film.ratingCount, count))),
      glow: unit(film.adjusted, score),
      pull: film.avgRating - film.adjusted
    }));

  const floorY = yOf(scoreFloor);

  // Tick positions: average along the front edge, rating count along the right edge, score up the back-left corner.
  const averageTicks: AxisTick[] = [];
  for (let value = Math.ceil(average[0] * 5) / 5; value <= average[1] + 1e-9; value += 0.2) {
    const rounded = Math.round(value * 10) / 10;
    averageTicks.push({ value: rounded, position: [xOf(rounded), floorY, BOX.halfDepth] });
  }
  const scoreTicks: AxisTick[] = [];
  for (let value = Math.ceil(scoreFloor * 2 + 1e-9) / 2; value <= SCORE_TOP + 1e-9; value += 0.5) {
    scoreTicks.push({ value, position: [-BOX.halfWidth, yOf(value), -BOX.halfDepth] });
  }
  const countTicks: AxisTick[] = COUNT_TICKS.filter((value) => value >= count[0] && value <= count[1]).map((value) => ({
    value,
    position: [BOX.halfWidth, floorY, zOf(value)]
  }));

  const everyOther = <T,>(items: T[]) => (compact ? items.filter((_, index) => index % 2 === 0) : items);
  const labels: AxisLabel[] = [
    ...everyOther(averageTicks).map((tick): AxisLabel => ({ text: tick.value.toFixed(1), position: tick.position, side: 'below' })),
    { text: 'Average rating, in stars', position: [0, floorY, BOX.halfDepth], side: 'below', title: true },
    ...everyOther(countTicks).map((tick): AxisLabel => ({ text: String(tick.value), position: tick.position, side: 'right' })),
    { text: 'Ratings', position: [BOX.halfWidth, floorY, -BOX.halfDepth], side: 'right', title: true },
    { text: `Mean ${mean.toFixed(2)}`, position: [-BOX.halfWidth, floorY, -BOX.halfDepth], side: 'left' },
    ...scoreTicks.map((tick): AxisLabel => ({ text: tick.value.toFixed(1), position: tick.position, side: 'left' })),
    { text: 'Adjusted score', position: [-BOX.halfWidth, BOX.height, -BOX.halfDepth], side: 'above', title: true }
  ];

  return {
    points,
    mean,
    floorY,
    domain: { average, count, score },
    ticks: { average: averageTicks, count: countTicks, score: scoreTicks },
    labels
  };
}

/** Pixel offset of a label from its anchor, shared by both renderers. */
export function labelOffset(label: AxisLabel): { x: number; y: number; align: 'center' | 'left' | 'right' } {
  switch (label.side) {
    case 'below':
      return { x: 0, y: label.title ? 46 : 14, align: 'center' };
    case 'above':
      return { x: 0, y: -16, align: 'center' };
    case 'right':
      return { x: label.title ? 12 : 12, y: label.title ? -16 : 0, align: 'left' };
    default:
      return { x: -10, y: 0, align: 'right' };
  }
}

// ---- A small perspective camera, for the SVG still ----------------------------

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

export type Projected = {
  x: number;
  y: number;
  /** Distance in front of the camera; larger is farther away. */
  depth: number;
  /** Pixels per scene unit at this depth. */
  scale: number;
};

/** Returns a function that projects a scene position onto a `width` by `height` picture, as the shared camera sees it. */
export function createProjector(width: number, height: number): (point: Vec3) => Projected {
  const forward = normalize(sub(CAMERA.target, CAMERA.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const focal = 1 / Math.tan((CAMERA.fov * Math.PI) / 360);
  const aspect = width / height;

  return (point) => {
    const offset = sub(point, CAMERA.position);
    const depth = dot(offset, forward);
    const ndcX = (dot(offset, right) * focal) / aspect / depth;
    const ndcY = (dot(offset, up) * focal) / depth;
    return {
      x: ((ndcX + 1) / 2) * width,
      y: ((1 - ndcY) / 2) * height,
      depth,
      scale: (focal / depth) * (height / 2)
    };
  };
}

/**
 * Moves a label's anchor so its text stays inside a chart `width` pixels wide.
 * Text width is estimated at the labels' 11px size (about 6.4px per character
 * for titles, 6px for tick values), with a 4px margin.
 */
export function keepInside(x: number, align: 'center' | 'left' | 'right', text: string, title: boolean, width: number): number {
  const estimate = text.length * (title ? 6.4 : 6);
  const margin = 4;
  if (align === 'left') return Math.max(margin, Math.min(x, width - margin - estimate));
  if (align === 'right') return Math.min(width - margin, Math.max(x, margin + estimate));
  return Math.max(margin + estimate / 2, Math.min(x, width - margin - estimate / 2));
}
