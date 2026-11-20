import { memo, useEffect, useMemo, useState, type CSSProperties, type Ref } from 'react';
import clsx from 'clsx';
import { POSTER, buildPoster, titleScale, type PosterFilm } from '../../lib/poster';
import { tmdbPoster, type TmdbPoster } from '../../lib/tmdb';

type FilmPosterProps = {
  film: PosterFilm;
  /** With a TMDB id, a real poster replaces the generated one where TMDB is switched on and has one. */
  tmdbId?: string | null;
  /** The `sizes` attribute for the real poster image. */
  sizes?: string;
  /** Receives the element that tilts (see usePosterTilt). */
  tiltRef?: Ref<HTMLDivElement>;
  className?: string;
};

const INK = 'var(--cm-text-primary)';

/**
 * A film's poster. By default it is generated from the film's own numbers (see
 * lib/poster.ts for what each mark means). The art is decoration: the film's
 * title, year and figures are always given as text beside it, so the poster is
 * hidden from assistive technology.
 */
function FilmPoster({ film, tmdbId, sizes = '(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw', tiltRef, className }: FilmPosterProps) {
  // Keyed on the values, not the object, so a parent may build `film` inline.
  const genreKey = film.genres.join('|');
  const art = useMemo(
    () => buildPoster(film),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [film.movieId, film.title, film.year, genreKey, film.avgRating, film.ratingCount, film.adjusted]
  );
  const [photo, setPhoto] = useState<TmdbPoster | null>(null);
  const [photoShown, setPhotoShown] = useState(false);

  useEffect(() => {
    let current = true;
    setPhoto(null);
    setPhotoShown(false);
    tmdbPoster(tmdbId).then((found) => {
      if (current) setPhoto(found);
    });
    return () => {
      current = false;
    };
  }, [tmdbId]);

  const rated = art.rated;
  const percent = (value: number, of: number) => `${((value / of) * 100).toFixed(2)}%`;
  const style = {
    '--poster-sky-top': art.palette.skyTop,
    '--poster-sky-glow': art.palette.skyGlow,
    '--poster-water-near': art.palette.waterNear,
    '--poster-water-deep': art.palette.waterDeep,
    '--poster-ground': art.palette.ground,
    // An unrated film has no horizon: the sky runs down to the title.
    '--poster-line': rated ? percent(rated.lineY, POSTER.height) : '64%',
    '--poster-halo-x': rated ? percent(rated.disc.cx, POSTER.width) : '50%',
    '--poster-halo-y': rated ? percent(rated.disc.cy, POSTER.height) : '-60%'
  } as CSSProperties;

  return (
    <div className={clsx('cm-poster-stage', className)} aria-hidden="true">
      <div ref={tiltRef} className="cm-poster" style={style} data-photo={photoShown || undefined}>
        {rated && (
          <svg viewBox={`0 0 ${POSTER.width} ${POSTER.height}`} className="absolute inset-0 size-full" focusable="false">
            {rated.levels.map((y) => (
              <line key={y} x1="0" x2={POSTER.width} y1={y} y2={y} stroke={INK} strokeWidth="0.5" opacity="0.13" />
            ))}
            <g stroke={INK} strokeLinecap="round" fill="none">
              <path d={rated.sky[0]} strokeWidth="1.1" opacity="0.6" />
              <path d={rated.sky[1]} strokeWidth="1.6" opacity="0.8" />
              <path d={rated.sky[2]} strokeWidth="2.3" opacity="0.96" />
              <path d={rated.water[0]} strokeWidth="0.9" opacity="0.34" />
              <path d={rated.water[1]} strokeWidth="1.1" opacity="0.5" />
            </g>
            {rated.reflection.map((stroke) => (
              <line
                key={stroke.y}
                x1={stroke.x1}
                x2={stroke.x2}
                y1={stroke.y}
                y2={stroke.y}
                stroke={INK}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={stroke.opacity}
              />
            ))}
            <circle cx={rated.disc.cx} cy={rated.disc.cy} r={rated.disc.r} fill={INK} opacity="0.14" />
            <circle cx={rated.disc.cx} cy={rated.disc.cy} r={rated.disc.r - 0.4} fill="none" stroke={INK} strokeWidth="0.8" opacity="0.5" />
            {rated.discAbove && <path d={rated.discAbove} fill={INK} opacity="0.95" />}
            <line
              x1="0"
              x2={POSTER.width}
              y1={rated.lineY}
              y2={rated.lineY}
              stroke="var(--cm-accent)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        <div className="cm-poster-ground" />

        <div className="cm-poster-text">
          <p className="cm-poster-title" data-scale={titleScale(art.title)}>
            {art.title}
          </p>
          <p className="cm-poster-billing">
            <span className="tabular-nums">{film.year ?? 'Year unknown'}</span>
            {art.billing.length > 0 && <span className="truncate">{art.billing.join(' · ')}</span>}
          </p>
        </div>

        {photo && (
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={sizes}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="cm-poster-photo"
            onLoad={() => setPhotoShown(true)}
            onError={() => setPhoto(null)}
          />
        )}

        <div className="cm-poster-grain" />
        <div className="cm-poster-sheen" />
      </div>
    </div>
  );
}

export default memo(FilmPoster);
