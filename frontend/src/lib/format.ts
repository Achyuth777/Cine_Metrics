import { ApiError, isUnreachable } from '../api';

// Counts use en-US grouping (100,836) so figures read the same as in the dataset's own documentation.
const countFormat = new Intl.NumberFormat('en-US');

export const formatCount = (value: number): string => countFormat.format(value);

/** A rating or score to two decimals, or a dash when the film has none. */
export const formatScore = (value: number | null | undefined, digits = 2): string =>
  value === null || value === undefined ? '—' : value.toFixed(digits);

const TRAILING_YEAR = /\s*\((\d{4})\)\s*$/;

/** MovieLens titles end with the year, as in "Heat (1995)". The year is shown on its own, so drop it from the name. */
export const titleWithoutYear = (title: string): string => title.replace(TRAILING_YEAR, '');

/** "Crime|Drama" becomes "Crime, Drama". */
export const genreText = (genres: string): string => genres.split('|').filter(Boolean).join(', ');

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

/** One plain sentence for a failed request, plus what the visitor can do about it. */
export function describeError(error: unknown, subject: string): { title: string; message: string } {
  if (isUnreachable(error)) {
    const status = error instanceof ApiError && error.status ? ` (HTTP ${error.status})` : '';
    return {
      title: `Couldn’t load ${subject}`,
      message: `The CineMetrics API isn’t responding${status}. If you’re running this locally, start the backend on port 8000, then retry.`
    };
  }
  if (error instanceof ApiError) {
    return {
      title: `Couldn’t load ${subject}`,
      message: error.detail ?? `The API returned an error (HTTP ${error.status}).`
    };
  }
  return { title: `Couldn’t load ${subject}`, message: 'Something went wrong while reading the response.' };
}
