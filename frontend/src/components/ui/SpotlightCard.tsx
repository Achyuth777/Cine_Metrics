/**
 * SpotlightCard — adapted from React Bits (https://github.com/DavidHDev/react-bits),
 * src/ts-default/Components/SpotlightCard.
 *
 * Changes from the original:
 * - The light and the border glow are radial gradients drawn once and moved with
 *   `transform`, so the effect animates transform and opacity only. The original
 *   repainted the gradient's position on every frame.
 * - The beam shape, ambient drift, press flare, grain and light theme were removed.
 * - The surface and border default to the CineMetrics tokens.
 * - The effect stays off when the visitor prefers reduced motion.
 * The pointer smoothing, proximity fade and keyboard-focus follow are the original's.
 *
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0,
 * see ./react-bits-LICENSE.md. Used here as part of an application, which the
 * licence allows; the component itself may not be sold or redistributed.
 */
import React, { useEffect, useRef } from 'react';

import './SpotlightCard.css';

export type SpotlightCardProps = React.HTMLAttributes<HTMLDivElement> & {
  spotlightColor?: string;
  intensity?: number;
  spotlightSize?: number;
  softness?: number;
  borderGlow?: number;
  proximity?: number;
  smoothing?: number;
};

type Settings = {
  size: number;
  intensity: number;
  borderGlow: number;
  proximity: number;
  smoothing: number;
};

const RIM_SCALE = 0.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const falloff = (color: string, softness: number) => {
  const soft = clamp(softness, 0, 1);
  const core = (1 - soft) ** 1.5 * 0.85;
  const stop = (alpha: number, at: number) =>
    `color-mix(in srgb, ${color} ${(alpha * 100).toFixed(2)}%, transparent) ${(at * 100).toFixed(2)}%`;
  const list = [stop(1, 0)];
  for (let i = 0; i <= 14; i++) {
    const t = core + ((1 - core) * i) / 14;
    const g = (t - core) / (1 - core);
    const smooth = 1 - g * g * (3 - 2 * g);
    const glow = Math.exp(-4.6 * g * g) * (1 - g ** 6);
    list.push(stop(smooth + (glow - smooth) * soft, t));
  }
  return list.join(', ');
};

const SpotlightCard = ({
  children,
  className = '',
  style,
  spotlightColor = 'var(--cm-text-primary)',
  intensity = 0.15,
  spotlightSize = 240,
  softness = 0.7,
  borderGlow = 0.6,
  proximity = 80,
  smoothing = 0.3,
  ...rest
}: SpotlightCardProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const edgeRef = useRef<HTMLSpanElement>(null);
  const rimRef = useRef<HTMLSpanElement>(null);
  const size = Math.max(20, spotlightSize);
  const settings: Settings = {
    size,
    intensity: clamp(intensity, 0, 1),
    borderGlow: clamp(borderGlow, 0, 1),
    proximity: Math.max(0, proximity),
    smoothing: clamp(smoothing, 0, 1)
  };
  const settingsRef = useRef(settings);

  // Keep the animation loop reading the latest props without restarting it.
  useEffect(() => {
    settingsRef.current = settings;
  });

  useEffect(() => {
    const root = rootRef.current;
    const light = lightRef.current;
    const edge = edgeRef.current;
    const rim = rimRef.current;
    if (!root || !light || !edge || !rim) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const state = { x: 0, y: 0, presence: 0 };
    const pointer = { x: 0, y: 0, active: false };
    let focus: Element | null = null;
    let raf = 0;
    let last = 0;
    let alive = true;

    const paint = (s: Settings) => {
      const reach = s.size * RIM_SCALE;
      light.style.transform = `translate3d(${(state.x - s.size).toFixed(1)}px, ${(state.y - s.size).toFixed(1)}px, 0)`;
      rim.style.transform = `translate3d(${(state.x - reach).toFixed(1)}px, ${(state.y - reach).toFixed(1)}px, 0)`;
      light.style.opacity = String(Math.min(1, state.presence * s.intensity));
      edge.style.opacity = String(Math.min(1, state.presence * s.borderGlow));
    };

    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const rect = root.getBoundingClientRect();
      let tx = state.x;
      let ty = state.y;
      let target = 0;
      if (focus && root.contains(focus)) {
        const box = focus.getBoundingClientRect();
        tx = box.left + box.width / 2 - rect.left;
        ty = box.top + box.height / 2 - rect.top;
        target = 1;
      } else if (pointer.active) {
        tx = pointer.x - rect.left;
        ty = pointer.y - rect.top;
        const gap = Math.hypot(Math.max(0, -tx, tx - rect.width), Math.max(0, -ty, ty - rect.height));
        if (gap === 0) target = 1;
        else if (s.proximity > 0) target = Math.max(0, 1 - gap / s.proximity) ** 2;
      }
      if (state.presence < 0.02 && target > 0) {
        state.x = tx;
        state.y = ty;
      }
      const follow = s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.015 + s.smoothing * 0.22));
      state.x += (tx - state.x) * follow;
      state.y += (ty - state.y) * follow;
      const fade = 1 - Math.exp(-dt / (target > state.presence ? 0.1 : 0.32));
      state.presence += (target - state.presence) * fade;
      if (Math.abs(target - state.presence) < 0.002) state.presence = target;
      paint(s);
      const moving = Math.abs(tx - state.x) > 0.1 || Math.abs(ty - state.y) > 0.1;
      if (moving || state.presence !== target) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (state.presence > 0 || settingsRef.current.proximity > 0 || root.contains(event.target as Node | null)) wake();
    };
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      pointer.active = false;
      wake();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      pointer.active = false;
      wake();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(':focus-visible')) return;
      focus = event.target;
      wake();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (root.contains(event.relatedTarget as Node | null)) return;
      focus = null;
      wake();
    };
    const onScroll = () => {
      if (pointer.active || state.presence > 0) wake();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('pointerout', onOut);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const reach = size * RIM_SCALE;

  return (
    <div
      ref={rootRef}
      className={`spotlight-card${className ? ` ${className}` : ''}`}
      style={
        {
          '--spotlight-card-surface': 'var(--cm-bg-secondary)',
          '--spotlight-card-border': 'color-mix(in srgb, var(--cm-text-primary) 8%, transparent)',
          ...style
        } as React.CSSProperties
      }
      {...rest}
    >
      <span
        ref={lightRef}
        className="spotlight-card__light"
        style={{
          width: size * 2,
          height: size * 2,
          backgroundImage: `radial-gradient(circle closest-side, ${falloff(spotlightColor, softness)})`
        }}
        aria-hidden="true"
      />
      {children}
      <span className="spotlight-card__border" aria-hidden="true" />
      <span ref={edgeRef} className="spotlight-card__edge" aria-hidden="true">
        <span
          ref={rimRef}
          className="spotlight-card__rim"
          style={{
            width: reach * 2,
            height: reach * 2,
            backgroundImage: `radial-gradient(circle closest-side, ${falloff(spotlightColor, 1)})`
          }}
        />
      </span>
    </div>
  );
};

export default SpotlightCard;
