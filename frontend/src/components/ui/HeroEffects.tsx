// The heavy parts of the landing hero, loaded with React.lazy after first paint:
// the WebGL aurora and the GSAP word-by-word headline.
import { useEffect, useState } from 'react';
import { cubicBezier, useReducedMotion } from 'motion/react';
import Aurora from './Aurora';
import SplitText from './SplitText';
import HeroHeadlineStatic from './HeroHeadlineStatic';
import { HEADLINE_ACCENT, HEADLINE_CLASS, HEADLINE_ID, HEADLINE_LEAD, HEADLINE_TEXT } from './heroHeadline';

// Same curve as --cm-ease-out in index.css: a strong ease-out for entrances.
const easeOut = cubicBezier(0.23, 1, 0.32, 1);

const WORD_STAGGER_MS = 60;
const WORD_DURATION_S = 0.8;
const FROM = { opacity: 0, yPercent: 40 };
const TO = { opacity: 1, yPercent: 0 };
// The accent line starts just after the first line's second word.
const TO_ACCENT = { ...TO, delay: 0.12 };
// Room for descenders, since each line clips its rising words.
const LINE_CLASS = 'pb-[0.12em] -mb-[0.12em]';

// The plain headline (the Suspense fallback, still in the page while this renders)
// stays at opacity 0 for HEADLINE_GRACE_MS. If it is still invisible, nobody has
// read it yet and the words can make their entrance; if it is showing, replaying
// words the visitor has already read would look like a glitch, so stay still.
const plainHeadlineUnseen = () => {
  const plain = document.getElementById(HEADLINE_ID);
  return !plain || Number(getComputedStyle(plain).opacity) < 0.1;
};

export function HeroHeadline() {
  const reduceMotion = useReducedMotion();
  const [animate] = useState(() => !reduceMotion && plainHeadlineUnseen());

  if (!animate) return <HeroHeadlineStatic />;

  return (
    <h1 id={HEADLINE_ID} className={HEADLINE_CLASS}>
      <span className="sr-only">{HEADLINE_TEXT}</span>
      <span aria-hidden="true" className="block">
        <span className="block">
          <SplitText
            tag="span"
            text={HEADLINE_LEAD}
            splitType="words"
            textAlign="left"
            trigger="load"
            delay={WORD_STAGGER_MS}
            duration={WORD_DURATION_S}
            ease={easeOut}
            from={FROM}
            to={TO}
            className={LINE_CLASS}
          />
        </span>
        <span className="cm-headline-accent block">
          <SplitText
            tag="span"
            text={HEADLINE_ACCENT}
            splitType="words"
            textAlign="left"
            trigger="load"
            delay={WORD_STAGGER_MS}
            duration={WORD_DURATION_S}
            ease={easeOut}
            from={FROM}
            to={TO_ACCENT}
            className={LINE_CLASS}
          />
        </span>
      </span>
    </h1>
  );
}

// Aurora takes canvas colours, so read the palette tokens rather than repeat hex codes.
const AURORA_TOKENS = ['--cm-accent-teal', '--cm-accent-violet-deep', '--cm-accent-amber'];

const readAuroraStops = () => {
  const styles = getComputedStyle(document.documentElement);
  return AURORA_TOKENS.map((token) => styles.getPropertyValue(token).trim()).filter(Boolean);
};

// On phones the text spans the whole width, so the aurora is drawn dimmer to keep
// the headline and body text above their contrast minimums.
const COMPACT_QUERY = '(max-width: 639px)';

function useCompactScreen() {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return compact;
}

type HeroAuroraProps = {
  paused: boolean;
};

export function HeroAurora({ paused }: HeroAuroraProps) {
  const reduceMotion = useReducedMotion();
  const compact = useCompactScreen();
  const [colorStops] = useState(readAuroraStops);

  return (
    <Aurora
      colorStops={colorStops}
      amplitude={1.1}
      blend={0.6}
      speed={0.45}
      height={0.5}
      glow={0.5}
      brightness={compact ? 0.7 : 0.8}
      layers={2}
      opacity={compact ? 0.42 : 0.55}
      dpr={1}
      paused={paused || !!reduceMotion}
      className="h-full w-full"
    />
  );
}
