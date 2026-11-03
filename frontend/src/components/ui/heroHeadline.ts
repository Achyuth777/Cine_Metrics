// The landing page headline, shared by the plain version and the animated one so
// both render the same words with the same type.

export const HEADLINE_ID = 'hero-title';
export const HEADLINE_LEAD = 'Movie Intelligence.';
export const HEADLINE_ACCENT = 'Computed at Distributed Scale.';
export const HEADLINE_TEXT = `${HEADLINE_LEAD} ${HEADLINE_ACCENT}`;

// Two lines from 640px up; the accent line wraps once on phones.
export const HEADLINE_CLASS =
  'text-balance font-bold leading-[1.04] tracking-[-0.03em] text-cm-ink text-[length:clamp(2rem,8.6vw,2.6rem)] sm:text-[length:min(5.6vw,4.5rem)]';

// How long the plain headline waits before showing itself. If the animated
// headline arrives while the plain one is still hidden, it plays its entrance;
// after that, the plain headline is already readable and stays still.
export const HEADLINE_GRACE_MS = 320;
