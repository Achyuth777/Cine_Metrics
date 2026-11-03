import { Fragment, type CSSProperties } from 'react';
import { HEADLINE_ACCENT, HEADLINE_CLASS, HEADLINE_GRACE_MS, HEADLINE_ID, HEADLINE_LEAD } from './heroHeadline';

type HeroHeadlineStaticProps = {
  /** Wait a moment before showing, so the animated headline can take over without a flash. */
  holdForEffects?: boolean;
};

const ACCENT_WORDS = HEADLINE_ACCENT.split(' ');

/**
 * The hero headline as plain text: the Suspense fallback while the effects load,
 * and the final state when motion is reduced. The accent words use the same
 * `split-word` class GSAP gives them, so both versions share one set of styles.
 */
export default function HeroHeadlineStatic({ holdForEffects = false }: HeroHeadlineStaticProps) {
  return (
    <h1
      id={HEADLINE_ID}
      className={`${HEADLINE_CLASS}${holdForEffects ? ' cm-headline-hold' : ''}`}
      style={holdForEffects ? ({ '--cm-headline-hold': `${HEADLINE_GRACE_MS}ms` } as CSSProperties) : undefined}
    >
      <span className="block">{HEADLINE_LEAD}</span>{' '}
      <span className="cm-headline-accent block">
        {ACCENT_WORDS.map((word, index) => (
          <Fragment key={word}>
            {index > 0 && ' '}
            <span className="split-word inline-block">{word}</span>
          </Fragment>
        ))}
      </span>
    </h1>
  );
}
