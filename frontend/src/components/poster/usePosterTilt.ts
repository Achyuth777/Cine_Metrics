import { useCallback, useEffect, useRef, type PointerEvent } from 'react';

/** How far the poster leans at its edges, in degrees. */
const MAX_TILT = 7;
const CAN_TILT = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/**
 * Lets a poster lean toward a mouse pointer, with a patch of light that follows it.
 *
 * Put `areaProps` on the element that receives the pointer (the card) and pass
 * `tiltRef` to the FilmPoster inside it. Only a mouse does anything: touch and
 * pen input are ignored, and so is everything when the visitor prefers reduced
 * motion. The lean is written straight to CSS variables, so moving the pointer
 * never re-renders React.
 */
export function usePosterTilt() {
  const poster = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const element = poster.current;
    if (!element || !element.hasAttribute('data-tilting')) return;
    element.removeAttribute('data-tilting');
    element.style.removeProperty('--poster-rx');
    element.style.removeProperty('--poster-ry');
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const element = poster.current;
      const stage = element?.parentElement;
      if (!element || !stage || event.pointerType !== 'mouse' || !window.matchMedia(CAN_TILT).matches) return;
      // Measured on the stage, which does not move, so the lean cannot feed back into the measurement.
      const box = stage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        reset();
        return;
      }
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        element.setAttribute('data-tilting', '');
        element.style.setProperty('--poster-rx', `${((0.5 - y) * 2 * MAX_TILT * 0.75).toFixed(2)}deg`);
        element.style.setProperty('--poster-ry', `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        element.style.setProperty('--poster-light-x', `${(x * 100).toFixed(1)}%`);
        element.style.setProperty('--poster-light-y', `${(y * 100).toFixed(1)}%`);
      });
    },
    [reset]
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { tiltRef: poster, areaProps: { onPointerMove, onPointerLeave: reset } };
}
