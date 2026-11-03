import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInView, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Film,
  GitBranch,
  HardDrive,
  Layers,
  Menu,
  Pause,
  Play,
  Search,
  Server,
  Star,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';
import { api } from '../api';
import { OverviewData } from '../types';
import CountUp from '../components/ui/CountUp';
import HeroHeadlineStatic from '../components/ui/HeroHeadlineStatic';
import SpotlightCard from '../components/ui/SpotlightCard';
import '../components/ui/landing.css';

// The WebGL aurora and the GSAP headline are the heavy parts of the hero, so they
// load in their own chunk; the page is readable before they arrive.
const loadHeroEffects = () => import('../components/ui/HeroEffects');
// When the app opens on "/", start the download right away instead of at first
// render, so the animated headline usually arrives inside its grace period.
if (window.location.pathname === '/') loadHeroEffects().catch(() => undefined);
// If the chunk can't load (offline, or a deploy mid-visit), keep the plain page
// rather than letting the error take the whole app down.
const NoAurora = () => null;
const HeroAurora = lazy<ComponentType<{ paused: boolean }>>(() =>
  loadHeroEffects()
    .then((module) => ({ default: module.HeroAurora }))
    .catch(() => ({ default: NoAurora }))
);
const HeroHeadline = lazy(() =>
  loadHeroEffects()
    .then((module) => ({ default: module.HeroHeadline }))
    .catch(() => ({ default: HeroHeadlineStatic }))
);

const FRAME = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';
const SECTION_SPACE = 'pt-20 sm:pt-28 lg:pt-32';
const SECTION_TITLE = 'text-balance text-3xl font-bold tracking-tight text-cm-ink sm:text-4xl lg:leading-[1.08]';

type Accent = 'gold' | 'teal' | 'violet' | 'emerald';

const ACCENT: Record<Accent, { text: string; bar: string; glow: string }> = {
  gold: { text: 'text-cm-gold', bar: 'bg-cm-gold', glow: 'var(--cm-accent-amber)' },
  teal: { text: 'text-cm-teal', bar: 'bg-cm-teal', glow: 'var(--cm-accent-teal)' },
  violet: { text: 'text-cm-violet', bar: 'bg-cm-violet', glow: 'var(--cm-accent-violet)' },
  emerald: { text: 'text-cm-emerald', bar: 'bg-cm-emerald', glow: 'var(--cm-accent-emerald)' }
};

const NAV_LINKS = [
  { to: '/overview', label: 'Studio Overview' },
  { to: '/movies', label: 'Movie Explorer' },
  { to: '/genres', label: 'Genre Taxonomy' },
  { to: '/ratings', label: 'Bayesian Intelligence' },
  { to: '/hadoop', label: 'Job Monitor' },
  { to: '/architecture', label: 'Viva Defense' }
];

const SEARCH_SUGGESTIONS = ['Pulp Fiction', 'Forrest Gump', 'Inception', 'Star Wars'];

const movieSearchPath = (term: string) => `/movies?search=${encodeURIComponent(term)}`;

function Code({ children, accent }: { children: ReactNode; accent: Accent }) {
  return (
    <code className={`rounded bg-cm-ink/[0.06] px-1 py-0.5 font-mono text-[0.86em] ${ACCENT[accent].text}`}>
      {children}
    </code>
  );
}

type Pillar = {
  jobs: string;
  title: string;
  accent: Accent;
  icon: LucideIcon;
  body: ReactNode;
  link: { to: string; label: string };
};

const PILLARS: Pillar[] = [
  {
    jobs: 'Job 1 & 2',
    title: 'In-Mapper Combiner',
    accent: 'gold',
    icon: Cpu,
    body: (
      <>
        Emits partial (sum, count) pairs locally on mapper nodes before network shuffle, slashing network I/O
        saturation by 95%.
      </>
    ),
    link: { to: '/architecture', label: 'Inspect Combiner logic' }
  },
  {
    jobs: 'Job 4',
    title: 'Map-Side Join (Cache)',
    accent: 'teal',
    icon: Layers,
    body: (
      <>
        Loads <Code accent="teal">movies.csv</Code> into memory via Hadoop{' '}
        <Code accent="teal">DistributedCache</Code> to join movie titles &amp; genres with ratings in O(1) time
        without shuffle overhead.
      </>
    ),
    link: { to: '/genres', label: 'Explore genre taxonomy' }
  },
  {
    jobs: 'Job 6',
    title: 'Bayesian True-Rating',
    accent: 'violet',
    icon: Award,
    body: (
      <>
        Implements true Bayesian shrinkage with prior weight <Code accent="violet">m=10</Code>, preventing 1-vote
        movies from gaming chart rankings.
      </>
    ),
    link: { to: '/ratings', label: 'See Bayesian engine' }
  },
  {
    jobs: 'Job 3 & 7',
    title: 'Partition Output Reader',
    accent: 'emerald',
    icon: HardDrive,
    body: (
      <>
        Directly reads and parses genuine multi-partition TSV files (<Code accent="emerald">part-r-00000</Code>)
        output by Hadoop reducers on HDFS.
      </>
    ),
    link: { to: '/hadoop', label: 'Inspect raw TSV output' }
  }
];

type StudioModule = {
  to: string;
  title: string;
  tag: string;
  accent: Accent;
  icon: LucideIcon;
  body: string;
  /** The two main workspaces get a double-width card. */
  wide?: boolean;
};

const MODULES: StudioModule[] = [
  {
    to: '/overview',
    title: 'Studio Overview',
    tag: 'Dashboard',
    accent: 'gold',
    icon: BarChart3,
    wide: true,
    body: 'Global KPIs, the full Top 10 rating volume leaderboard, and interactive half-star distribution histogram.'
  },
  {
    to: '/movies',
    title: 'Movie Explorer & Compare',
    tag: 'Catalog',
    accent: 'violet',
    icon: Film,
    wide: true,
    body: 'Full 9,742 titles search, multi-genre logic (AND/OR), release decade filters, and 2-to-4 movie side-by-side comparison.'
  },
  {
    to: '/genres',
    title: 'Genre Intelligence',
    tag: 'Join Analytics',
    accent: 'teal',
    icon: Layers,
    body: 'Compare audience volume against critical score across 20 categories. Multi-label taxonomy educational breakdown.'
  },
  {
    to: '/ratings',
    title: 'Rating Dynamics',
    tag: 'Bayesian Gems',
    accent: 'violet',
    icon: TrendingUp,
    body: 'Temporal rating trends from 1996–2018 Unix timestamps and interactive threshold controls for hidden gem discovery.'
  },
  {
    to: '/hadoop',
    title: 'Hadoop Job Monitor',
    tag: 'Telemetry',
    accent: 'emerald',
    icon: Server,
    body: 'Live NameNode (9870) and YARN (8088) port telemetry, cluster status, and the raw TSV partition file inspector.'
  },
  {
    to: '/architecture',
    title: 'Architecture & Viva Voce',
    tag: 'Examination',
    accent: 'gold',
    icon: GitBranch,
    body: '8-stage interactive pipeline flowchart, worked numerical calculation, and 20 college viva Q&A answers.'
  }
];

const PROOFS: { figure: string; label: string; accent: Accent }[] = [
  { figure: '14/14', label: 'API Tests Passed', accent: 'emerald' },
  { figure: '8/8', label: 'Java JUnit Tests Passed', accent: 'gold' },
  { figure: 'Hadoop 3.3.6', label: 'Uber-JAR', accent: 'teal' }
];

type Stat = {
  label: string;
  value: number;
  note: string;
  accent: Accent;
  decimals?: number;
  suffix?: string;
  spokenSuffix?: string;
};

const revealIndex = (index: number) => ({ '--cm-reveal-index': index }) as CSSProperties;

/** True once the element has scrolled into view; drives the section entrances. */
function useRevealOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const revealed = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  return [ref, revealed] as const;
}

function StatTile({ stat, index, reduceMotion }: { stat: Stat; index: number; reduceMotion: boolean }) {
  const { label, value, note, accent, decimals = 0, suffix = '', spokenSuffix = '' } = stat;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);

  return (
    <div className="rounded-2xl bg-cm-surface/85 p-4 sm:p-5">
      <dt className="flex items-center gap-2 text-[13px] font-medium text-cm-muted">
        <span className={`h-1.5 w-5 shrink-0 rounded-full ${ACCENT[accent].bar}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-3">
        <span
          aria-hidden="true"
          className="block text-[length:clamp(1.75rem,3vw,2.5rem)] font-semibold leading-none tracking-tight text-cm-ink tabular-nums"
        >
          {reduceMotion ? (
            `${formatted}${suffix}`
          ) : (
            <CountUp
              to={value}
              decimals={decimals || undefined}
              separator=","
              suffix={suffix}
              duration={1.4}
              delay={index * 0.08}
              easing="expo"
            />
          )}
        </span>
        <span className="sr-only">
          {formatted}
          {spokenSuffix}
        </span>
        <span className={`mt-2 block text-[13px] leading-snug ${ACCENT[accent].text}`}>{note}</span>
      </dd>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [auroraPaused, setAuroraPaused] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [pillarsRef, pillarsRevealed] = useRevealOnce<HTMLDivElement>();
  const [modulesRef, modulesRevealed] = useRevealOnce<HTMLDivElement>();
  const [defenseRef, defenseRevealed] = useRevealOnce<HTMLDivElement>();

  useEffect(() => {
    api.getOverview().then(setOverview).catch(console.error);
  }, []);

  const handleQuickSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = quickSearch.trim();
    navigate(term ? movieSearchPath(term) : '/movies');
  };

  const closeMenuOnEscape = (event: KeyboardEvent<HTMLDetailsElement>) => {
    const menu = menuRef.current;
    if (event.key !== 'Escape' || !menu?.open) return;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  };

  const totalMovies = overview?.totalMovies ?? 9742;
  const totalRatings = overview?.totalRatings ?? 100836;
  const uniqueUsers = overview?.uniqueUsers ?? 610;
  const globalAvg = overview?.globalAverageRating ?? 3.50;

  const stats: Stat[] = [
    { label: 'Dataset Records', value: totalRatings, note: '100% MapReduce Reduced', accent: 'teal' },
    { label: 'Catalog Titles', value: totalMovies, note: '1902 – 2018 Eras', accent: 'gold' },
    { label: 'Unique Users', value: uniqueUsers, note: 'Independent movie raters', accent: 'violet' },
    {
      label: 'Global Benchmark',
      value: globalAvg,
      decimals: 2,
      suffix: ' ★',
      spokenSuffix: ' stars',
      note: 'Bayesian Prior Mean (C)',
      accent: 'emerald'
    }
  ];

  return (
    <div
      className="min-h-screen overflow-x-clip bg-cm-base text-cm-ink selection:bg-cm-gold/25 selection:text-cm-ink"
      style={{ colorScheme: 'dark' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-cm-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cm-base"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-cm-base">
        <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-cm-gold" aria-hidden="true">
              <Star className="size-5 fill-cm-base text-cm-base" />
            </span>
            <span className="text-base font-bold tracking-tight text-cm-ink" translate="no">
              CineMetrics
            </span>
            <span
              className="hidden rounded-full bg-cm-gold/10 px-2 py-0.5 text-[11px] font-medium text-cm-gold tabular-nums sm:inline"
              translate="no"
            >
              Hadoop 3.3.6
            </span>
          </div>

          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-6 text-[13px] font-medium text-cm-muted">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="cm-tone rounded-md px-1 py-1 hover:text-cm-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <details ref={menuRef} className="cm-menu relative xl:hidden" onKeyDown={closeMenuOnEscape}>
              <summary className="cm-press inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium text-cm-ink-soft hover:bg-cm-raised hover:text-cm-ink">
                <Menu className="size-4" aria-hidden="true" />
                Menu
              </summary>
              <nav
                aria-label="Primary"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-cm-raised p-2 shadow-2xl shadow-black/60"
              >
                <ul>
                  {NAV_LINKS.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="cm-tone block rounded-xl px-3 py-2.5 text-sm text-cm-ink-soft hover:bg-cm-raised-hover hover:text-cm-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>

            <Link
              to="/overview"
              className="cm-press cm-nudge-trigger hidden h-10 items-center gap-2 rounded-full border border-cm-gold/40 px-4 text-[13px] font-semibold text-cm-gold hover:border-cm-gold hover:bg-cm-gold/10 sm:inline-flex"
            >
              Launch Studio
              <ArrowRight className="cm-nudge size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="scroll-mt-16">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative isolate">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="cm-hero-glow absolute inset-0" />
            <div className="cm-hero-aurora absolute inset-x-0 top-0 h-[420px] sm:h-full sm:max-h-[760px]">
              <Suspense fallback={null}>
                <HeroAurora paused={auroraPaused} />
              </Suspense>
            </div>
          </div>

          <div className={`${FRAME} pb-8 pt-14 sm:pb-12 sm:pt-20 lg:pb-16 lg:pt-24`}>
            <div>
              {reduceMotion ? (
                <HeroHeadlineStatic />
              ) : (
                <Suspense fallback={<HeroHeadlineStatic holdForEffects />}>
                  <HeroHeadline />
                </Suspense>
              )}
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p className="max-w-[60ch] text-base leading-relaxed text-cm-ink-soft sm:text-lg">
                  Engineered with <strong className="font-semibold text-cm-ink">Apache Hadoop MapReduce</strong> on
                  HDFS. Processing 100,836+ MovieLens reviews across distributed partitions to uncover genuine
                  audience behavior, Bayesian true ratings, and overlooked cinema gems.
                </p>
                <p className="mt-4 text-sm text-cm-ink-soft">
                  SRM IST Ramapuram <span aria-hidden="true">•</span> Big Data Essentials (21CSC314P){' '}
                  <span aria-hidden="true">•</span> <span className="font-medium text-cm-gold">Achyuth PV</span>
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/overview"
                    className="cm-press cm-nudge-trigger inline-flex h-12 items-center gap-2 rounded-full bg-cm-gold px-6 text-sm font-semibold text-cm-base hover:bg-cm-gold-hover"
                  >
                    Open Intelligence Studio
                    <ArrowRight className="cm-nudge size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/movies"
                    className="cm-press inline-flex h-12 items-center gap-2 rounded-full bg-cm-raised px-5 text-sm font-semibold text-cm-ink hover:bg-cm-raised-hover"
                  >
                    <Film className="size-4 text-cm-gold" aria-hidden="true" />
                    Search 9,742 Movies
                  </Link>
                  <Link
                    to="/architecture"
                    className="cm-press cm-nudge-trigger inline-flex h-12 items-center gap-2 rounded-full px-3 text-sm font-semibold text-cm-teal hover:text-cm-ink"
                  >
                    <GitBranch className="size-4" aria-hidden="true" />
                    Viva Examination Guide
                    <ChevronRight className="cm-nudge size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <form
                  role="search"
                  aria-label="Quick movie search"
                  onSubmit={handleQuickSearchSubmit}
                  className="rounded-3xl bg-cm-surface/85 p-3 sm:p-4"
                >
                  <div className="cm-search-field flex items-center gap-3 rounded-2xl bg-cm-base/70 px-4">
                    <Search className="size-4 shrink-0 text-cm-muted" aria-hidden="true" />
                    <input
                      type="search"
                      name="search"
                      value={quickSearch}
                      onChange={(e) => setQuickSearch(e.target.value)}
                      placeholder="Search by title (e.g., Matrix, Shawshank, Toy Story)…"
                      aria-label="Search movies by title"
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="search"
                      className="h-12 min-w-0 flex-1 bg-transparent text-sm text-cm-ink placeholder:text-cm-muted"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-cm-muted">
                      <span>Try searching:</span>
                      {SEARCH_SUGGESTIONS.map((term) => (
                        <Link
                          key={term}
                          to={movieSearchPath(term)}
                          className="cm-tone rounded-sm text-cm-ink-soft underline decoration-cm-muted/40 underline-offset-4 hover:text-cm-gold hover:decoration-cm-gold"
                        >
                          {term}
                        </Link>
                      ))}
                    </p>
                    <button
                      type="submit"
                      className="cm-press ml-auto h-10 shrink-0 rounded-full bg-cm-violet/15 px-5 text-sm font-semibold text-cm-violet hover:bg-cm-violet/25"
                    >
                      Analyze
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-3 lg:mt-14 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <StatTile key={stat.label} stat={stat} index={index} reduceMotion={reduceMotion} />
              ))}
            </dl>

            {!reduceMotion && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuroraPaused((paused) => !paused)}
                  className="cm-tone inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-cm-muted hover:bg-cm-raised hover:text-cm-ink"
                >
                  {auroraPaused ? (
                    <Play className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Pause className="size-3.5" aria-hidden="true" />
                  )}
                  {auroraPaused ? 'Play background animation' : 'Pause background animation'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Four MapReduce pillars */}
        <section aria-labelledby="pillars-title" className={`${FRAME} ${SECTION_SPACE}`}>
          <div
            ref={pillarsRef}
            className={`cm-reveal grid gap-10 xl:grid-cols-12 xl:gap-12${pillarsRevealed ? ' is-revealed' : ''}`}
          >
            <div className="xl:col-span-5">
              <div className="max-w-2xl xl:sticky xl:top-28">
                <p data-reveal style={revealIndex(0)} className="text-sm font-medium text-cm-gold">
                  Distributed Computing Architecture
                </p>
                <h2
                  id="pillars-title"
                  data-reveal
                  style={revealIndex(0)}
                  className={`mt-3 ${SECTION_TITLE} lg:text-5xl xl:text-[2.75rem]`}
                >
                  How Hadoop MapReduce Powers Every Calculation
                </h2>
                <p data-reveal style={revealIndex(1)} className="mt-5 text-base leading-relaxed text-cm-ink-soft">
                  Unlike shallow dashboards backed by synthetic arrays or simple Pandas loops, CineMetrics executes
                  true distributed processing patterns.
                </p>
                <p data-reveal style={revealIndex(2)} className="mt-8 flex items-center gap-4">
                  <span className="text-5xl font-semibold leading-none tracking-tight text-cm-ink tabular-nums">7</span>
                  <span className="text-sm leading-snug text-cm-ink-soft">
                    Hadoop Batch Jobs
                    <span className="block text-cm-emerald">Uber-JAR Compiled</span>
                  </span>
                </p>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 xl:col-span-7">
              {PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;
                const accent = ACCENT[pillar.accent];
                return (
                  <li key={pillar.title} data-reveal style={revealIndex(index + 1)}>
                    <SpotlightCard
                      spotlightColor={accent.glow}
                      intensity={0.16}
                      spotlightSize={260}
                      borderGlow={0.7}
                      className="flex h-full flex-col rounded-3xl p-6 sm:p-7"
                    >
                      <p className={`flex items-center gap-2 text-sm font-semibold ${accent.text}`}>
                        <Icon className="size-4" aria-hidden="true" />
                        {pillar.jobs}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-cm-ink">{pillar.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-cm-ink-soft">{pillar.body}</p>
                      <div className="mt-auto pt-6">
                        <Link
                          to={pillar.link.to}
                          className={`cm-tone cm-nudge-trigger inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold ${accent.text} hover:text-cm-ink`}
                        >
                          {pillar.link.label}
                          <ChevronRight className="cm-nudge size-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </SpotlightCard>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Six studio modules */}
        <section aria-labelledby="modules-title" className={`${FRAME} ${SECTION_SPACE}`}>
          <div ref={modulesRef} className={`cm-reveal cm-reveal--settle${modulesRevealed ? ' is-revealed' : ''}`}>
            <div
              data-reveal
              style={revealIndex(0)}
              className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
            >
              <h2 id="modules-title" className={`max-w-[20ch] ${SECTION_TITLE} lg:text-5xl`}>
                Complete Workspace for Analysis &amp; Viva Defense
              </h2>
              <p className="flex items-center gap-4 lg:pb-1">
                <span className="text-5xl font-semibold leading-none tracking-tight text-cm-teal tabular-nums">6</span>
                <span className="text-base leading-snug text-cm-ink-soft">Specialized Intelligence Modules</span>
              </p>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
              {MODULES.map((module, index) => {
                const Icon = module.icon;
                const accent = ACCENT[module.accent];
                const id = `module${module.to.replace('/', '-')}`;
                return (
                  <li
                    key={module.to}
                    data-reveal
                    style={revealIndex(index + 1)}
                    className={module.wide ? 'sm:col-span-2' : undefined}
                  >
                    <Link
                      to={module.to}
                      aria-labelledby={`${id}-title`}
                      aria-describedby={`${id}-desc`}
                      className="cm-tone cm-nudge-trigger flex h-full flex-col rounded-3xl bg-cm-surface p-6 hover:bg-cm-raised sm:p-7"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-3">
                          <span className={`h-1.5 w-6 rounded-full ${accent.bar}`} aria-hidden="true" />
                          <Icon className={`size-5 ${accent.text}`} aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-cm-ink/[0.06] px-2.5 py-1 text-xs font-medium text-cm-muted">
                          {module.tag}
                        </span>
                      </div>
                      <h3
                        id={`${id}-title`}
                        className={`mt-10 font-semibold tracking-tight text-cm-ink ${module.wide ? 'text-2xl' : 'text-lg'}`}
                      >
                        {module.title}
                      </h3>
                      <p
                        id={`${id}-desc`}
                        className={`mt-2 leading-relaxed text-cm-muted ${module.wide ? 'max-w-[52ch] text-base' : 'text-[15px]'}`}
                      >
                        {module.body}
                      </p>
                      <span className={`mt-auto flex justify-end pt-6 ${accent.text}`} aria-hidden="true">
                        <ArrowUpRight className="cm-nudge cm-nudge--diagonal size-5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Academic defense banner */}
        <section aria-labelledby="defense-title" className={`${FRAME} ${SECTION_SPACE}`}>
          <div
            ref={defenseRef}
            className={`cm-reveal rounded-[2rem] bg-cm-field px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16${defenseRevealed ? ' is-revealed' : ''}`}
          >
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
              <div data-reveal style={revealIndex(0)} className="lg:col-span-7">
                <p className="text-sm font-medium text-cm-gold">B.Tech IT Project Evaluation</p>
                <h2
                  id="defense-title"
                  className="mt-3 text-balance text-3xl font-bold tracking-tight text-cm-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
                >
                  Ready for College Demonstration &amp; Grading
                </h2>
                <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-cm-ink-soft sm:text-lg">
                  Built to defend during viva voce examinations: mathematically rigorous, verifiable MapReduce
                  partition outputs, and zero fabricated claims.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/overview"
                    className="cm-press inline-flex h-12 items-center rounded-full bg-cm-gold px-6 text-sm font-semibold text-cm-base hover:bg-cm-gold-hover"
                  >
                    Launch Studio
                  </Link>
                  <Link
                    to="/architecture"
                    className="cm-press inline-flex h-12 items-center rounded-full bg-cm-base/60 px-6 text-sm font-semibold text-cm-ink hover:bg-cm-base"
                  >
                    Review 20 Viva Questions
                  </Link>
                </div>
              </div>

              <ul className="grid gap-3 lg:col-span-5">
                {PROOFS.map((proof, index) => (
                  <li
                    key={proof.label}
                    data-reveal
                    style={revealIndex(index + 1)}
                    className="flex items-center gap-4 rounded-2xl bg-cm-base/55 px-5 py-4"
                  >
                    <CheckCircle2 className={`size-5 shrink-0 ${ACCENT[proof.accent].text}`} aria-hidden="true" />
                    <span className="text-2xl font-semibold tracking-tight text-cm-ink tabular-nums">
                      {proof.figure}
                    </span>
                    <span className="text-sm text-cm-ink-soft">{proof.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-cm-surface sm:mt-28 lg:mt-32">
        <div className={`${FRAME} flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="text-base text-cm-ink-soft">
              <span className="font-bold text-cm-ink" translate="no">
                CineMetrics
              </span>{' '}
              — Movie Ratings Analysis Using Apache Hadoop MapReduce
            </p>
            <p className="mt-1 text-sm text-cm-muted">Developer: Achyuth PV • SRM IST Ramapuram (21CSC314P)</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/Achyuth777/Cine_Metrics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cm-tone inline-flex items-center gap-1.5 rounded-sm text-cm-ink-soft hover:text-cm-gold"
                >
                  GitHub Repository
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <Link to="/hadoop" className="cm-tone rounded-sm text-cm-ink-soft hover:text-cm-gold">
                  Cluster Telemetry
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
