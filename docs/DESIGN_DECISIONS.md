# CineMetrics redesign: decisions and status

One file, updated in place at the end of each stage. Branch: `feat/film-journal-redesign`.

## Status

| Stage | Scope | State |
|---|---|---|
| 1. Audit | Stack, routes, dataset figures, 502 diagnosis, defects | Done, 14 Nov 2026 |
| 2. Visual foundation | Tokens, app shell, landing page, `/movies` | Built and verified, 14 Nov 2026. Not yet reviewed. |
| 3. Full redesign | `/overview`, `/genres`, `/ratings`, `/hadoop`, `/architecture` | All five built, 18 Nov 2026. Waiting for review. |
| 4. Verification | All commands, three widths, every Explorer control | Done, 18 Nov 2026. See "Stage 4: verification". |
| Visual layer 1 | Hero "Ratings constellation" (3D) | Built, 14 Nov 2026. Waiting for review. |
| Visual layer 2–4 | Posters, `/ratings` 3D surface, fonts and grain | Built, 18 Nov 2026. Waiting for review. |

**Next action:** review visual layers 2–4. Stage 3 (`/overview`, `/genres`, `/ratings`, `/hadoop`, `/architecture`) is still to do.

---

## Stage 1: audit

### Verified stack

Read from `frontend/package.json`, `npm ls`, `backend/requirements.txt` and `hadoop/pom.xml`.

| Layer | What the repo uses | Notes |
|---|---|---|
| Frontend | React 19.3.1, react-router-dom 7.18.4, Vite 8.3.4, TypeScript 6.0.3, Tailwind CSS 4.3.3 (`@tailwindcss/vite`), Recharts 3.10.1, lucide-react 1.60.0 | `clsx` and `tailwind-merge` are installed but unused. `gsap`, `@gsap/react`, `motion` were added by PR #1 for the old hero. |
| Backend | FastAPI, Uvicorn, Pydantic v2 (pinned 0.115.6 / 0.34.0 / 2.10.3) | This machine has newer versions installed (0.154.0 / 0.54.0 / 2.14.1). The API runs on them. |
| Batch jobs | Java 17, Hadoop 3.3.6, JUnit 4.13.2, built with Maven | Seven jobs in `hadoop/src/main/java/com/cinemetrics/mapreduce/`. |

Commands found:

| Purpose | Command | Where |
|---|---|---|
| Dev server | `npm run dev` | `frontend/` |
| Build and type-check | `npm run build` (`tsc -b && vite build`) | `frontend/` |
| Lint | `npm run lint` (`oxlint`) | `frontend/` |
| Preview build | `npm run preview` | `frontend/` |
| API tests | `python -m pytest tests/test_backend_api.py` | repo root |
| Java tests | `mvn test` | `hadoop/` (Maven is not installed on this machine) |
| Full local start | `scripts/run_all.ps1` (process data, start API on 8000, start Vite on 5173) | repo root |

There are no frontend tests.

Baseline before any redesign change (14 Nov 2026, commit `730930b`):

- `tsc -b`: passes.
- `oxlint`: 0 errors, 53 warnings (mostly unused imports).
- `pytest`: **13 passed, 1 failed.** `test_hadoop_status_and_jobs` expects at least 7 recorded jobs, but `data/processed/jobs.json` is git-ignored, so a clean clone has none.
- JUnit: **unverified** (no Maven here).

### Routes, features and data dependencies

All endpoints are served by `backend/routers/*.py`. The API loads `data/raw/*.csv` and `data/processed/<job>/part-r-00000` into memory at start (`backend/data_loader.py`).

| Route | Features | Endpoints (file:line) |
|---|---|---|
| `/` | Hero, quick search, four stat tiles, pillar cards, module cards, defense banner | `GET /api/overview` (`overview.py:22`) |
| `/overview` | Four stat cards, rating distribution chart, top 10 most rated, hidden-gems teaser | `/api/overview`; `/api/ratings/distribution` (`ratings.py:24`); `/api/movies` (`movies.py:31`); `/api/analytics/hidden-gems` (`analytics.py:26`) |
| `/movies` | Search (applies on submit), genre multi-select with AND/OR, minimum average rating, minimum rating count (default 5), release-year range, sort by five keys with direction toggle, table/grid toggle, 16 per page, compare 2 to 4 films, detail drawer | `/api/movies`; `/api/genres` (`genres.py:25`); `/api/movies/{id}` (`movies.py:308`); `/api/movies/compare` (`movies.py:260`) |
| `/genres` | Two bar charts (rating volume, average rating), summary table, link into the Explorer per genre | `/api/genres` |
| `/ratings` | Ratings by release year, monthly activity, distribution, hidden gems with three adjustable thresholds | `/api/ratings/years` (`ratings.py:65`); `/api/ratings/trends` (`ratings.py:44`); `/api/ratings/distribution`; `/api/analytics/hidden-gems` |
| `/hadoop` | Cluster status, job history, raw partition file preview | `/api/hadoop/status` (`hadoop.py:47`); `/api/hadoop/jobs` (`hadoop.py:102`); `/api/hadoop/output-preview` (`hadoop.py:174`) |
| `/architecture` | Pipeline walkthrough, viva Q&A, background sections | None (static) |
| App shell | Status badge | `/api/hadoop/status` |

`GET /api/dataset/info` (`hadoop.py:228`) exists in the client but no page calls it.

The frontend has no timers, random values or simulated jobs. The backend status and job endpoints probe real Hadoop URLs and return empty results when nothing answers.

### Dataset figures

Method: a read-only Python script recounted `data/raw/ratings.csv` and `data/raw/movies.csv`, then compared the result with each processed output file and with the running API.

| Figure | Recount from CSV | API (`/api/overview`) | Result |
|---|---|---|---|
| Ratings | 100,836 | 100,836 | Verified |
| Movies | 9,742 | 9,742 | Verified |
| Users | 610 | 610 | Verified |
| Mean rating | 3.5016 | 3.5016 | Verified |
| Genres | 19, plus the label "(no genres listed)" | 19 | Verified. Old UI copy said 20. |

Also verified:

- 9,724 movies have at least one rating; 18 have none.
- Ratings were submitted between 29 Mar 1996 and 24 Sep 2018.
- Release years in titles run from 1902 to 2018; 13 titles carry no year.
- `avgrating` output: 9,724 rows, 0 differences from the recount.
- `ratingdist` output: 10 buckets summing to 100,836, identical to the recount.
- `ratingtrends` output: 267 months summing to 100,836.
- `genrepop` output: per-genre movie counts match a count of *rated* movies. Genre tags total 22,084 across 9,742 movies and per-genre rating counts total 274,480, because a movie can carry several genres.

**Unverified:** which engine produced the committed output files. The API reports `engine: python-reference` and no job records. `scripts/process_dataset.py` is a Python pipeline that mirrors the Java jobs and writes the same file layout. No Hadoop cluster, Docker or Maven is available here to run the Java jobs.

### The adjusted (Bayesian) score, as implemented

`WR = (v / (v + m)) × R + (m / (v + m)) × C`, where `v` is the film's rating count, `R` its average rating, `m` the prior weight and `C` the prior mean.

| Where | m | C | Used for |
|---|---|---|---|
| `backend/data_loader.py:620` | 10 | Mean of `ratings.csv`, 3.5016 | `weightedRating` on every movie (Explorer, detail, compare) |
| `hadoop/.../HiddenGemsJob.java:171-175` | 10 (configurable) | 3.5 (configurable) | Stored `hiddenGemScore`; the job also keeps only films with 5 to 50 ratings and an average of 4.0 or more |

The two priors differ slightly: Lawrence of Arabia (4.3 from 45 ratings) scores 4.1545 in the job output and 4.1548 from the API. The UI must show whichever value the endpoint returns and name its parameters.

### 502 errors: root cause

The frontend calls same-origin `/api/...` (`frontend/src/api.ts:18`, `API_BASE = ''`). Vite proxies `/api` to `http://127.0.0.1:8000` (`frontend/vite.config.ts:11-16`). There is no environment variable involved. When no backend process listens on port 8000, the proxy answers 502.

Evidence, 14 Nov 2026:

```
$ curl -i http://127.0.0.1:5173/api/overview
HTTP/1.1 502 Bad Gateway

$ curl -v http://127.0.0.1:8000/api/overview
* connect to 127.0.0.1 port 8000 failed: Connection refused

Vite log:
[vite] http proxy error: /api/overview
Error: connect ECONNREFUSED 127.0.0.1:8000
```

After starting the API (`python -m uvicorn main:app --app-dir backend --port 8000`), the same request returned `200 OK`, and so did all thirteen endpoints through the proxy.

Conclusion: an environment cause, not a code or config defect. `npm run dev` on its own does not start the API; `scripts/run_all.ps1` does. No backend change is needed for this. The frontend's job is to show the failure honestly, which the redesign covers.

### Defects, ranked

1. **Landing hero unreadable on real GPUs.** On an AMD Radeon GPU (ANGLE, Direct3D 11) the WebGL aurora added in PR #1 paints solid white, leaving the `#F4F4F5` headline at 1.10:1. Software rendering does not show it, which is why PR #1's checks missed it.
2. **The Explorer ignores the URL.** `MovieExplorerPage.tsx` keeps every filter in component state. Links from `/` (`?search=`), `/genres` (`?genre=`) and `/ratings` (`?search=`) open an unfiltered list, and filters are lost on reload or navigation.
3. **Misleading health badge.** `Layout.tsx:217` shows "Snapshot Valid" whenever the cluster is not connected, including when the status request itself failed.
4. **Unsupported claims and silent fallbacks on the landing page.** "14/14 API Tests Passed" (actual: 13 of 14 here), "8/8 Java JUnit Tests Passed" (unverified), "slashing network I/O saturation by 95%" (no measurement in the repo), "100% MapReduce Reduced" and "genuine Hadoop" wording while the API reports `python-reference`. The stat tiles fall back to hard-coded numbers when the API fails, with no indication.
5. **Backend reports the wrong "last processed" time.** `overview.py:49` returns the API start time as `lastProcessed` when no processing time is recorded. Backend change, so it needs approval. The redesign does not display this field.
6. **Failed requests are not handled the same way on every route.** `/movies` has an error state; other routes vary. Covered route by route.
7. **Genre count wording.** Copy says 20 categories; the data and API have 19 genres.
8. **Two priors for the adjusted score** (see above). Not a bug, but the UI currently presents one formula.
9. **Visual noise.** Gold, teal, violet and emerald accents plus the aurora; heavy monospace; body text at 12px.
10. **Housekeeping.** 53 lint warnings; `alert()` used for the compare limit; one API test fails on a clean clone.

---

## Visual system

Direction: an art-directed film journal paired with a credible research workspace. Hierarchy comes from composition, type and whitespace.

### Tokens

Defined once in `frontend/src/index.css` and exposed as Tailwind utilities.

| Role | Value | Utility |
|---|---|---|
| Canvas | `#101112` | `bg-canvas` |
| Surface 1 | `#191B1E` | `bg-surface-1` |
| Surface 2 | `#22252A` | `bg-surface-2` |
| Text primary | `#F3EFE7` | `text-ink` |
| Text secondary | `#B1B3B8` | `text-ink-2` |
| Accent | `#E8B568` | `text-accent`, `bg-accent` |
| Accent, hover on fills | `#F0C583` | `bg-accent-strong` |
| Text on accent | `#101112` | `text-on-accent` |
| Divider (decorative) | Text primary at 10% | `border-line` |
| Control boundary | `#7A7D84` | `border-line-strong` |
| Status: connected | `#7FC8A0` | `text-ok` |
| Status: error | `#F0907F` | `text-danger` |

Other colours are reserved for data or status distinctions.

### Contrast (WCAG 2.x, computed)

| Foreground | On canvas | On surface 1 | On surface 2 | Needed |
|---|---|---|---|---|
| Text primary | 16.48 | 15.05 | 13.40 | 4.5 |
| Text secondary | 9.01 | 8.23 | 7.33 | 4.5 |
| Accent (links, active nav, focus ring) | 10.12 | 9.24 | 8.23 | 4.5 text, 3 UI |
| Control boundary | 4.59 | 4.19 | 3.73 | 3 |
| Status: connected | 9.61 | 8.77 | 7.81 | 4.5 |
| Status: error | 8.10 | 7.40 | 6.59 | 4.5 |

| Pair | Ratio | Needed |
|---|---|---|
| Dark text on accent fill | 10.12 | 4.5 |
| Dark text on accent hover fill | 11.72 | 4.5 |
| Accent text on 14% amber tint (over canvas / surface 1 / surface 2) | 7.81 / 6.91 / 6.12 | 4.5 |
| Primary text on 14% amber tint (over canvas / surface 1 / surface 2) | 12.73 / 11.26 / 9.96 | 4.5 |
| Failed-request panel outline, status error at 60% (against canvas / surface 1) | 3.80 / 3.47 | 3 |

Dividers are decorative (about 1.3:1) and never the only boundary of a control.

The outline row was measured from a screenshot of `/movies` with every API request failed: the outline renders as `#9A6158`, 1px on all four sides. The panel sits on the canvas on pages and on surface 1 inside the drawer and compare dialog. Against surface 2 the same outline would be 3.09.

### Type, layout, motion

- **Two families, self-hosted (changed in visual layer 4).** Literata for selected headlines and poster titles; Public Sans for everything else. See "Visual layers 2–4".
- Tabular numerals on every metric.
- Landing content width 1240px. One spacing scale (Tailwind's 4px scale). Corner radii 8px for controls and 12px for panels.
- Transitions 150 to 200ms on colour and transform only. `prefers-reduced-motion` turns them off. No scroll effects, loops or intro animation.
- Imagery is generated from data (posters). Real TMDB posters appear only when a key is configured, and always over the generated poster, so nothing depends on an image loading.

---

## Stage 2: what was built

- **Tokens** in `frontend/src/index.css`, exposed as Tailwind utilities. The old palette is kept only as a marked legacy block for the retired hero-effect files.
- **Shared components** in `frontend/src/components/system/`: button styles, page header, modal and drawer (native `<dialog>`), metric, score scale, source note. `components/LoadingState.tsx` now gives loading, empty and failed three distinct looks: a quiet line with a spinner, a dashed neutral outline with centred text, and a solid panel with a red-tinted outline, a warning icon and a Retry button. The failed panel first had a thick red bar down its left edge; that was replaced with the outline after a design check flagged the bar.
- **App shell** (`components/Layout.tsx`): compact top navigation with an active state, a skip link, and two separate facts. The header shows API connectivity, taken from the outcome of real requests (`src/apiStatus.ts`); it reads "connected" only after a request succeeds and offers Retry when one fails. The footer shows dataset provenance: dataset name, the engine the API reports, and when the API loaded it.
- **Landing page**: rebuilt to the seven-part brief. Data is live; if the API can't be reached it shows a recorded sample under a visible "Demo data" label (`src/demo/`, never imported by studio routes).
- **Movie Explorer**: every filter, the sort, the page and the view live in the URL (`src/lib/explorerParams.ts`). Links from other pages with `?search=` or `?genre=` now work. Detail drawer and compare dialog are accessible dialogs. A failed request shows an error panel and no count.

Explorer behaviour kept from before: search and number fields apply on submit; genres, sort, view and page apply at once; default minimum of 5 ratings; 16 per page; compare 2 to 4 films.

Verification run on the production build, 14 Nov 2026:

- `npm run build` passes. `oxlint`: 0 errors; no warnings in Stage 2 files.
- API tests: 13 pass, 1 fails, same as the baseline.
- A scripted browser run exercises every Explorer control: 40 of 40 checks pass.
- Screenshots at 375, 768 and 1440 for the landing page and `/movies` (table, grid, filtered, empty, failed, detail, compare). No sideways page scroll at any width.

Finding from this stage: `GET /api/hadoop/status` and `/api/hadoop/jobs` block the whole API for several seconds when no cluster answers, because the probes run synchronously. The old shell called the status endpoint on every navigation. The new shell does not. Backend change, so it needs approval.

---

## Visual layer 1: the Ratings constellation

**What it shows.** The 500 films with the highest adjusted scores, using the Explorer's default filter (at least 5 ratings). Across is average rating. Depth and dot size are the number of ratings on a log scale. Height is the adjusted score, and the floor is the dataset mean. A line above each dot runs up to the height of its plain average, so its length is the Bayesian pull.

The brief gave the axes as x, y and z with "vertical lines" for the pull. Height was chosen for the adjusted score because only then is the pull a vertical line.

**How it is built.**

- One model (`src/lib/constellation.ts`) feeds two renderers that share one camera: a WebGL scene and a static SVG. The SVG is a true still of the 3D chart.
- The page shows the SVG first. The 3D code (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`) loads afterwards in its own chunk with `React.lazy`, and replaces the SVG once a frame has been drawn.
- SVG is used on screens under 768px (top 150 films), when WebGL is missing, if the scene throws, if the WebGL context is lost, or if the first frame comes out bright instead of dark. That last check exists because of the white-canvas defect recorded in Stage 1.
- 500 dots are one instanced mesh; all pull lines are one draw call. Device pixel ratio is capped at 2. Rendering stops when the chart is off screen, the tab is hidden, motion is paused, or the visitor prefers reduced motion (a static frame; drag still works).
- Drag orbits within limits. Zoom and pan are off, so the wheel scrolls the page. Vertical touch swipes scroll the page.
- Bloom, grain and a vignette are post-processing passes. Colours come from the tokens.
- Accessibility: the chart is one keyboard stop; arrow keys move between films, Enter opens one in the Explorer, and a live region reads the same text as the tooltip. "View as table" lists every plotted film with links. "Pause motion" stops the drift.
- If the API can't be reached, a recorded sample of the same 500 films loads on demand and is labelled "Demo data".

**Motion rule, revised.** Stage 2 recorded "no loops". The 3D brief asks for a slow camera drift, so the rule is now: no looping motion except the constellation's drift, which is slow (about 2° per second), can be paused, and stops under reduced motion.

**Assets.** No models or textures. All geometry is procedural.

**Measurements, 14 Nov 2026**, production build, headless Chrome on the machine's GPU (AMD Radeon, Direct3D 11), 1440×900, device pixel ratio 1:

| | Before | After |
|---|---|---|
| First-load JS | 800.16 kB (231.74 kB gzip) | 816.30 kB (236.87 kB gzip) |
| CSS | 47.06 kB (9.80 kB gzip) | 47.48 kB (9.85 kB gzip) |
| 3D chunk, loaded after first paint | none | 1,031.42 kB (273.96 kB gzip) |
| Demo sample, loaded only if the API fails | none | 29.38 kB (12.65 kB gzip) |

Frame time over 5 seconds: median 4.2 ms, worst 4.3 ms, no frame over 20 ms (about 240 fps with the frame cap off). Not measured at device pixel ratio 2 or on other hardware.

---

## Visual layers 2–4

### Layer 4: fonts and texture

- **Fonts:** Literata 5.3.0 and Public Sans 5.3.0 from `@fontsource-variable` (SIL Open Font License 1.1), served from this site with `font-display: swap`. Only the Latin and Latin Extended files are referenced; Latin Extended loads only when text needs it.
- **Why not Libre Franklin** (the first pick): its packaged font has no `tnum` feature, checked in the file and measured in Chrome (digit widths 110, 74, 96, 107 px). Public Sans, derived from it, has `tnum`; tabular digits measured identical (112 px).
- Fallback faces are scaled with `size-adjust` to the web fonts' widths, measured in Chrome on Windows: Segoe UI 104.5 %, Arial 103 %, Palatino or Georgia 105.5 %.
- Tabular numerals now apply to every `table`, `dl`, `input` and chart, because Public Sans sets digits proportionally by default.
- **Film grain:** an inline SVG noise tile over the whole page at 2.8 % opacity. Fixed, takes no pointer input, hidden in print and forced colours.
- **Light falloff:** utilities `lit-hero`, `lit-section`, `lit-panel`: faint gradients of the text colour (4–7 %) from the top, on the hero, landing sections, the studio main area and data panels.

### Layer 2: posters

- `src/lib/poster.ts` draws each poster from the film's data only: one light per rating (sky above the horizon, glints below), a disc at the average rating, an amber horizon at the adjusted score, faint rules in the water at each whole star below the score, and a tint from the most specific genre (specificity counted from `movies.csv`). Seeded by `movieId`, so a poster never changes.
- Used in the Explorer grid and the landing page's two-film figure. The art is `aria-hidden`; the same numbers are always printed beside it.
- **Tilt and sheen:** CSS 3D transform and a moving light, mouse only, at most 7°. Off under reduced motion and for touch or pen.
- **TMDB posters, optional:** on only when the dev or preview server starts with `TMDB_API_KEY`. The browser calls `/tmdb/movie/<id>`; the Vite server adds the key and forwards that path only (all other `/tmdb` paths answer 404). The key never enters the bundle (checked). Images load lazily from `image.tmdb.org` with no referrer, and replace the generated poster only once loaded. The TMDB attribution line shows under the grid whenever this is on. A production host would need the same small proxy.

### Layer 3: Bayesian pull, `/ratings`

- The surface is `WR = (v/(v+m))·R + (m/(v+m))·C` with m = 10 and C = the dataset mean from `/api/overview`, as `backend/data_loader.py:620` computes it. Across: rating count (log). Depth: average rating. Height: adjusted score.
- Dots are real films (about 450 after removing duplicates: most rated, highest and lowest averages, top adjusted). At m = 10 their heights are the API's `weightedRating`. A stem runs to the height of the plain average.
- Labelled "Computed from the stored snapshot". The m slider sits in a box labelled "Educational simulation" and says the app's scores still use m = 10.
- Same box, camera and projector as the constellation. WebGL scene lazy-loaded; SVG still on phones (150 films, spread evenly by count), without WebGL, or after a bad first frame. Renders only on demand (no drift), so nothing runs while idle, off screen or hidden. Instanced dots; device pixel ratio capped at 2. Keyboard, live region and "View as table" as in the constellation.
- No demo data on studio routes: a failed request shows the error panel.

### Measurements, 18 Nov 2026 (production build)

| | Before layers 2–4 | After |
|---|---|---|
| First-load JS | 816.30 kB (236.87 kB gzip) | 840.62 kB (245.01 kB gzip) |
| Font files | none | up to about 290 kB; only faces in use load |
| 3D code, lazy | 1,031 kB in one chunk | 940 kB shared three/drei + 92 kB constellation + 6 kB pull scene |

Checks run: poster interactions 17/17 (tilt, settle, click-through, tab stops, reduced motion, touch, phone layout); TMDB path with intercepted responses 13/13 and without a key 3/3; proxy rules 8/9 (the failure was a connection reset from TMDB on a run that had passed before; not re-run); pull chart in WebGL at 1440, SVG at 375 (150 dots) and with WebGL off (448 dots); keyboard, slider and table checks pass. **Not measured:** frame rate of the pull scene (on-demand only); real TMDB posters with a real key.

**Assets.** No models, textures or images are shipped. Fonts: OFL 1.1, the Literata Project Authors and the Public Sans Project Authors.

## Stage 3, part 1: `/overview` and `/genres`

**`/overview`** answers "what is in the dataset" and "where should I start":
- A row of five figures from `/api/overview`, each with a plain-language note. "Each rated at least 20 films" was checked against `ratings.csv` (minimum 20, 610 users).
- One visualisation: how ratings are spread across star values, with two computed sentences (most common value, share at 4 stars or more, share of half stars).
- One ranked list: top 10 by adjusted score, at least 5 ratings, showing average, count and adjusted score together. Titles link to the film in the Explorer.
- "Where to start": four pre-filtered Explorer views (most rated; 4+ average with 50+ ratings; every film unfiltered; `/ratings`).
- Each block loads and fails on its own, with the shared error panel; nothing falls back to made-up numbers.
- Removed from the old page: "All 7 MapReduce Jobs Verified", "Apache Hadoop MapReduce 3.3.6" as the processing engine, the `lastProcessed` timestamp (defect 5), the hard-coded "Mode: 4.0 ★ (26,818 ratings)" and "49.8%" fallbacks, and the teal/emerald accents.

**`/genres`** favours ranking and filtering over charts:
- An explanation that genres overlap, with live totals: 22,012 film entries and 274,433 rating entries in `/api/genres`, against 9,742 films and 100,836 ratings. (These differ from the Stage 1 count of 22,084 tags because the API counts rated films and leaves out "(no genres listed)".)
- One table of all 19 genres: ratings (with a bar), films, ratings per film, average rating, difference from the dataset average, and a link to the genre in the Explorer. Rank by any of five columns (select again to reverse); a filter hides genres with fewer than 100, 500 or 1,000 films.
- The two old Recharts bar charts are gone: the table carries the same numbers with explicit units, and is readable by screen readers as it is.

**New reusable component:** `components/system/BarList.tsx`, a horizontal bar chart drawn as a real table (label, bar, value in text). `lib/explorerParams.ts` gains `explorerPath(change)` for pre-filtered Explorer links.

**Checks, 18 Nov 2026:** build passes, lint clean on the changed files; screenshots at 375, 768 and 1440 for both pages and the failed state at 1440; no sideways page scroll at any width.

**Known:** on phones the top-10 and genre tables scroll sideways inside their own box, so the adjusted-score and average columns start off screen.

## Stage 3, part 2: `/ratings`, `/hadoop`, `/architecture`

**`/ratings`**
- Two real films side by side (a 5.00 average from very few ratings, and the top adjusted film), each with average, count and adjusted score.
- The formula as implemented, with m = 10 and C from `/api/overview`, naming `backend/data_loader.py` and noting that `HiddenGemsJob.java` defaults to C = 3.5.
- The Bayesian pull chart (layer 3), with its "Educational simulation" slider.
- Hidden gems, with the old thresholds now validated (minimum average, fewest and most ratings) and applied on submit. The page now says what the gem score is, from `backend/routers/analytics.py`: average ÷ log₂(ratings + 2). It is not Bayesian; the old page implied it was.
- Ratings by release decade and by year rated, as `BarList` tables. Removed unsupported copy ("Peak golden era", "surges around 2000 and 2015"), the "Jobs 5, 6, 7" badge and the teal accents.

**`/hadoop`** keeps three things apart: live cluster status (with the time it was checked and "Check again"), recorded job history (an honest empty state here: no `jobs.json`), and stored outputs (seven folders; "Show first lines" opens an accessible dialog with the lines split into columns). A provenance block shows dataset, source, the engine the API reports, and when the API loaded. Removed: "Real-time cluster telemetry", "STANDBY" node badges, "Proves the Hadoop MapReduce job ran", hard-coded "100,836" input-record fallbacks. The CLI block is replaced by a pointer to `scripts/run_hadoop_jobs.sh`.

**`/architecture`**: six pipeline steps as the code implements them, each linked to its files on GitHub (`main` branch), a note that this copy's outputs come from `scripts/process_dataset.py`, and expandable sections (native `<details>`) for a worked example, the seven jobs, HDFS/YARN, and 20 viva questions.

Viva answers were checked against the Java code and corrected:
- Mapper key type is `Text`, not `IntWritable`.
- Six jobs use a combiner (genre popularity does not); "reduces shuffle traffic by over 95%" removed (no measurement).
- Map-side join is used by the genre and year jobs only.
- "All 7 jobs compile to a verified Uber-JAR … verified against unit tests" replaced: the outputs here were produced by the Python pipeline, and the 8 JUnit tests exist but were not run (no Maven here).
- "Velocity: continuous stream" corrected: the dataset is a static snapshot. "Zero code changes" softened; the jobs leave reducers at the default of one.

**Type:** `<code>` now inherits the sans, so no third (monospace) family appears until open decision 4 is answered.

**Checks, 18 Nov 2026:** build passes; screenshots at 375, 768, 1440 and failed state for all three pages, no sideways page scroll. Scripted: formula shows C = 3.5016; gem thresholds reject an invalid range and disable the button; output dialog shows 25 lines in 4 columns and closes; 23 expandable sections open; 21 source links. `/hadoop` took 5–10 seconds to fill because the status probe blocked the API; fixed on 20 Nov (see "Backend fixes").

## Stage 4: verification

Run on 18 Nov 2026 against the production build (`vite preview`) and the local API, in headless Chrome on this machine's GPU (AMD Radeon, Direct3D 11).

| Check | Result |
|---|---|
| `npm run build` (type-check and bundle) | Passes. First-load JS 778.38 kB (230.34 kB gzip); CSS 52.87 kB (11.40 kB gzip). |
| `oxlint` | 0 errors, 8 warnings (baseline: 53). All 8 are in the 3D files and the retired Aurora: canvas cursor styling, and a helper exported beside a component. |
| API tests (`pytest tests/test_backend_api.py`) | 13 pass, 1 fails: `test_hadoop_status_and_jobs`, the same pre-existing failure (no `jobs.json` in a clean clone). No backend file was changed. |
| Java tests | **Unverified**: Maven is not installed here. |
| Every route (`/`, `/overview`, `/movies` table and grid, `/genres`, `/ratings`, `/hadoop`, `/architecture`) at 375, 768 and 1440, live and with every API request failing | 48 of 48. Per page: no sideways scroll, exactly one h1, active nav item, no control without a name, no image without alt, no unlabeled field, every overflowing scroll box focusable, no console errors. With the API down, every studio route shows a failure message and none shows a zero count; the landing page's fallback is labelled "Demo data". |
| Keyboard: real Tab presses through each route | 7 of 7 routes, 44–45 stops each, every stop shows the 2px amber focus ring. |
| Explorer controls | 40 of 40 (one check updated: grid cards now label the count "Ratings", not "Rating count"). |
| Poster grid | 17 of 17 (tilt, settle, click-through, tab stops, reduced motion, touch, phone layout). |
| TMDB posters off (no key) | 3 of 3: no request, no notice, generated posters only. |
| Constellation | 3D on the GPU; frame time median 4.2 ms, worst 4.3 ms over 5 s (about 240 fps uncapped). Keyboard, tooltip, Enter to the Explorer, table view; leaving the page mid-tooltip throws nothing. Under reduced motion it renders without drift and the pause control is not offered. |
| Bayesian pull chart | 3D at 1440, SVG at 375 (150 dots) and with WebGL off; keyboard, slider note, simulated table column. |
| Canvas labels | Fixed during this stage: the label and `role="img"` were on a wrapper `<div>`; both are now on each `<canvas>` element. |
| Poster text contrast | Title on the poster ground at least 16.98:1 and credit line at least 9.28:1, across every genre tint (computed from the OKLCH values). |

**Not verified:** real TMDB posters with a real key; frame rate on other hardware or at device pixel ratio 2; screen-reader output in a real screen reader (only the accessibility tree was checked); Safari and Firefox.

## Backend fixes, 20 Nov 2026 (approved)

- **Cluster probes no longer block the API.** `backend/routers/hadoop.py` called the blocking `urlopen` inside `async` handlers, so every endpoint waited while a probe timed out. The probes now run on worker threads (`asyncio.to_thread`), and the HDFS and YARN probes run at the same time. Measured with no cluster present: `/api/overview` during a status probe went from 7,934 ms to 16–18 ms; `/api/hadoop/status` from 8,075 ms to about 4,100 ms.
- **"Last processed" no longer reports the API start time.** `backend/routers/overview.py` fell back to the time the API loaded the files when no processing time was recorded. It now returns `"unknown"`, the fallback the code already used further down. The field stays a string; the frontend does not display it.
- API tests: 13 pass, 1 fails, unchanged (the clean-clone `jobs.json` test, not touched).

## Contracts and calculations

No API contract, response shape, route or calculation has been changed. The two backend fixes above change timing and one value (`lastProcessed` is `"unknown"` when not recorded), not the shape.

## Open decisions

1. **Stage 3 is built.** Stage 4 (full verification across all routes) remains.
2. **Retired files and packages.** Deleted on 20 Nov (approved): `components/ui/`, `gsap`, `@gsap/react`, `motion`, `tailwind-merge`, and the legacy CSS tokens. Still unused but not deleted (not in that approval): `components/StatCard.tsx`, `components/ChartCard.tsx`, `hooks/useApi.ts`, `App.css`, `src/assets/*`, `public/icons.svg`.
3. **Fonts.** Decided: Literata and Public Sans (layer 4).
4. **Monospace.** Raw partition output on `/hadoop` reads best in a monospace face, which would be a third family.
5. **`@types/three` and `postprocessing`** are installed only indirectly. Add `@types/three` as an explicit dev dependency?
6. **Backend fixes.** The blocking probes and the "last processed" time are fixed (20 Nov). Still open: one API test fails on a clean clone because `jobs.json` is git-ignored.
7. **Constellation sample.** The top 500 by adjusted score form a narrow band. A sample that includes low-scoring films would fill the box but would no longer be "the top films".

## Known issues

- On phones the "Ratings" axis title clips at the right edge of the chart.
- Four lint warnings in the new 3D files (cursor styling on the canvas element, and a helper exported beside a component).
