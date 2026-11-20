import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink } from 'lucide-react';
import PageHeader from '../components/system/PageHeader';

const REPO = 'https://github.com/Achyuth777/Cine_Metrics/blob/main/';
const JOBS = 'hadoop/src/main/java/com/cinemetrics/mapreduce/';

/** A link to a file in the project's GitHub repository. */
function Source({ path, label }: { path: string; label?: string }) {
  return (
    <a
      href={`${REPO}${path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-sm text-[13px] text-accent underline-offset-4 hover:underline"
    >
      {label ?? path.split('/').pop()}
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only"> (opens on GitHub in a new tab)</span>
    </a>
  );
}

/** An expandable section on the native <details> element: keyboard and screen-reader support come with it. */
function Expandable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-3.5 font-semibold text-ink hover:text-accent [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 shrink-0 text-ink-2 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="max-w-[72ch] space-y-2 pb-4 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

const PIPELINE: { title: string; body: string; sources: { path: string; label?: string }[] }[] = [
  {
    title: 'Source data',
    body: 'MovieLens latest-small: ratings.csv (100,836 ratings: userId, movieId, rating, timestamp) and movies.csv (9,742 films: movieId, title, genres).',
    sources: [{ path: 'data/raw/ratings.csv' }, { path: 'data/raw/movies.csv' }]
  },
  {
    title: 'HDFS',
    body: 'The run script creates /cinemetrics/input and /cinemetrics/output in HDFS and copies both CSV files in.',
    sources: [{ path: 'scripts/run_hadoop_jobs.sh' }]
  },
  {
    title: 'MapReduce',
    body: 'Seven Java jobs, started through one driver. Six use a combiner. Genre popularity and ratings by year join movies.csv on the map side through the distributed cache.',
    sources: [{ path: `${JOBS}CineMetricsDriver.java` }, { path: JOBS, label: 'all seven jobs' }]
  },
  {
    title: 'Reducer output',
    body: 'Each job writes tab-separated part-r-00000 files. This copy serves them from data/processed/<job>/.',
    sources: [{ path: 'data/processed/', label: 'data/processed/' }]
  },
  {
    title: 'API',
    body: 'FastAPI loads every output file and the raw CSVs into memory at start, adds the adjusted (Bayesian) score to every film, and serves JSON under /api.',
    sources: [{ path: 'backend/data_loader.py' }, { path: 'backend/routers/', label: 'backend/routers/' }]
  },
  {
    title: 'Interface',
    body: 'This React app. It reads only the API; nothing on screen is computed from made-up data.',
    sources: [{ path: 'frontend/src/api.ts' }]
  }
];

const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: 'What is Big Data, and how does this project relate to it?',
    a: (
      <p>
        Data whose volume, speed or variety outgrows one machine. MovieLens latest-small (100,836 ratings) fits on a laptop, which
        makes it good for building and checking the pipeline; the jobs are written the MapReduce way so the same code can run on a
        cluster against the much larger MovieLens releases.
      </p>
    )
  },
  {
    q: 'Which of the “5 Vs” show up here?',
    a: (
      <p>
        Volume: 100,836 ratings here, millions in the larger releases. Variety: tabular CSVs, pipe-separated multi-genre labels,
        years embedded in titles. Veracity: quoted titles with commas, a header row, films with no ratings, titles with no year.
        Value: fair rankings and well-rated films few people saw. Velocity does not really apply: the dataset is a static snapshot.
      </p>
    )
  },
  {
    q: 'How is HDFS organised?',
    a: (
      <p>
        One NameNode keeps the file system’s namespace and the map of which blocks live where, in memory. DataNodes store the
        blocks (128 MB by default) and serve reads and writes. Each block is replicated, three times by default.
      </p>
    )
  },
  {
    q: 'What happens if a DataNode fails?',
    a: (
      <p>
        DataNodes send the NameNode a heartbeat every 3 seconds by default. When they stop for long enough (about ten minutes by
        default) the NameNode marks the node dead and copies its blocks from the surviving replicas to other nodes until each block
        is back to its replication factor.
      </p>
    )
  },
  {
    q: 'What does YARN do?',
    a: (
      <p>
        It separates resource management from MapReduce. The ResourceManager hands out CPU and memory across the cluster, a
        NodeManager on each machine runs containers, and each job gets an ApplicationMaster that requests containers and watches
        its tasks.
      </p>
    )
  },
  {
    q: 'What does the mapper in the average-rating job emit?',
    a: (
      <>
        <p>
          <code className="text-ink">AverageRatingMapper</code> is a <code className="text-ink">Mapper&lt;LongWritable, Text, Text, Text&gt;</code>.
          For each line of ratings.csv it skips the header, parses the fields with <code className="text-ink">CSVParser</code>, and
          writes the movieId as the key and <code className="text-ink">"rating,1"</code> as the value. Bad lines are counted with Hadoop
          counters (“Malformed Lines”, “Invalid Rating Values”) instead of failing the task.
        </p>
        <Source path={`${JOBS}AverageRatingJob.java`} />
      </>
    )
  },
  {
    q: 'Why use a combiner?',
    a: (
      <>
        <p>
          A combiner runs on the map side and pre-aggregates before data crosses the network. For the average-rating job it turns
          many <code className="text-ink">"rating,1"</code> values for the same film into one <code className="text-ink">"sum,count"</code>,
          so less data is shuffled. Six of the seven jobs set one; genre popularity does not. This project has no measurement of how
          much traffic it saves.
        </p>
        <Source path={`${JOBS}AverageRatingJob.java`} />
      </>
    )
  },
  {
    q: 'Can a combiner compute the average directly?',
    a: (
      <p>
        No. An average of averages is wrong when the groups differ in size: averaging 4.0 (from 2 ratings) and 2.0 (from 8) gives
        3.0, but the true average is (8 + 16) ÷ 10 = 2.4. So the combiner passes on sum and count, and only the reducer divides.
      </p>
    )
  },
  {
    q: 'What happens in shuffle and sort?',
    a: (
      <p>
        Each map output key is assigned to a reducer by the partitioner (by default a hash of the key modulo the number of
        reducers). Map output is buffered in memory, spilled to disk sorted by key, then fetched and merged by each reducer, so the
        reducer sees each key once with all its values. These jobs leave the number of reducers at Hadoop’s default.
      </p>
    )
  },
  {
    q: 'How are ratings joined with film details?',
    a: (
      <>
        <p>
          With a map-side join. The genre-popularity and year-rating jobs add movies.csv to the distributed cache
          (<code className="text-ink">job.addCacheFile</code>); each mapper loads it into a hash map in <code className="text-ink">setup()</code> and
          looks films up while reading ratings, so the film table never goes through the shuffle.
        </p>
        <Source path={`${JOBS}GenrePopularityJob.java`} /> <Source path={`${JOBS}YearRatingJob.java`} />
      </>
    )
  },
  {
    q: 'Map-side join or reduce-side join?',
    a: (
      <p>
        A map-side join needs one side small enough to fit in each mapper’s memory and avoids shuffling it. A reduce-side join tags
        records from both sides, shuffles them all and joins in the reducer: heavier on the network, but it works for any size.
      </p>
    )
  },
  {
    q: 'What is the adjusted (Bayesian) score?',
    a: (
      <>
        <p>
          (v ÷ (v + m)) × R + (m ÷ (v + m)) × C: v ratings, average R, prior weight m, prior mean C. The API uses m = 10 and C = the
          mean of all ratings (3.5016). The hidden-gems job uses m = 10 and C = 3.5 by default. A film with one perfect rating is
          pulled most of the way to C; a film with hundreds barely moves. <Link to="/ratings" className="text-accent underline-offset-4 hover:underline">See it on the Ratings page</Link>.
        </p>
        <Source path="backend/data_loader.py" /> <Source path={`${JOBS}HiddenGemsJob.java`} />
      </>
    )
  },
  {
    q: 'How are malformed rows handled?',
    a: (
      <>
        <p>
          <code className="text-ink">CSVParser</code> handles quoted fields, including titles with commas, and the mappers skip the header,
          check field counts and numeric parsing, and count each kind of skipped line with a Hadoop counter.
        </p>
        <Source path={`${JOBS}CSVParser.java`} />
      </>
    )
  },
  {
    q: 'How do release year and rating date differ?',
    a: (
      <>
        <p>
          Release year comes from the title, with the pattern <code className="text-ink">\((\d{'{'}4{'}'})\)\s*$</code> (Toy Story (1995) → 1995).
          The rating date comes from each rating’s Unix timestamp, formatted as year-month in UTC by the rating-trends job.
        </p>
        <Source path={`${JOBS}CSVParser.java`} /> <Source path={`${JOBS}RatingTrendsJob.java`} />
      </>
    )
  },
  {
    q: 'What are MapReduce’s main limits?',
    a: (
      <p>
        Heavy disk I/O (map output spills to disk, results go to HDFS), no in-memory reuse between iterations, which makes iterative
        algorithms slow, and high start-up cost per job, which rules out interactive queries.
      </p>
    )
  },
  {
    q: 'Why does data locality matter?',
    a: (
      <p>
        Moving the computation to the data is cheaper than moving the data. YARN tries to run each map task on a machine that holds
        a replica of its input block, so it reads from local disk.
      </p>
    )
  },
  {
    q: 'Why are HDFS blocks so large?',
    a: (
      <p>
        Large blocks (128 MB by default, against a few KB for a typical OS file system) spread the cost of a disk seek over a long
        sequential read and keep the NameNode’s in-memory block map small.
      </p>
    )
  },
  {
    q: 'Which engine produced the numbers in this app?',
    a: (
      <>
        <p>
          The API reports <strong className="text-ink">python-reference</strong>: the output files in this copy were written by
          <code className="text-ink"> scripts/process_dataset.py</code>, a Python version of the same seven jobs that writes the same files.
          Running the Java jobs needs a Hadoop cluster and Maven; there is no record in this copy of a cluster run (no
          <code className="text-ink"> data/processed/jobs.json</code>). The Java unit tests exist but were not run here.
          <Link to="/hadoop" className="ml-1 text-accent underline-offset-4 hover:underline">The Hadoop page</Link> shows what the API reports.
        </p>
        <Source path="scripts/process_dataset.py" /> <Source path="hadoop/src/test/java/com/cinemetrics/mapreduce/MapReduceUnitTest.java" />
      </>
    )
  },
  {
    q: 'What is secondary sort?',
    a: (
      <p>
        A way to have each reducer receive a key’s values in a chosen order: a composite key, a partitioner that hashes only the
        natural key, and a grouping comparator that groups by the natural key. These jobs do not use it.
      </p>
    )
  },
  {
    q: 'How would this scale to a larger MovieLens release?',
    a: (
      <p>
        Put the larger CSVs into HDFS and run the same jobs; nothing in them depends on the dataset’s size. On a bigger cluster you
        would also raise the number of reducers, which these jobs leave at the default of one.
      </p>
    )
  }
];

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Architecture"
        description="How the pipeline is built, as the code implements it, with links to the files. Technical detail and viva questions open on demand."
      />

      <section aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="text-lg font-semibold text-ink">The pipeline</h2>
        <ol className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, index) => (
            <li key={step.title} className="border-t-2 border-line-strong pt-4">
              <p className="text-sm font-semibold text-ink-2 tabular-nums">Step {index + 1}</p>
              <h3 className="mt-1.5 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {step.sources.map((source) => (
                  <Source key={source.path} {...source} />
                ))}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-[72ch] rounded-panel bg-surface-1 p-5 text-[15px] leading-relaxed text-ink-2 lit-panel">
          <strong className="font-semibold text-ink">In this copy,</strong> steps 2 and 3 were stood in for by{' '}
          <code className="text-ink">scripts/process_dataset.py</code>, which runs the same seven jobs in Python and writes the same
          output files. The footer of every studio page and the Hadoop page show which engine the API reports.
        </p>
      </section>

      <section aria-labelledby="detail-title" className="lit-panel rounded-panel bg-surface-1 p-5 sm:p-6">
        <h2 id="detail-title" className="text-lg font-semibold text-ink">Technical detail</h2>
        <div className="mt-2">
          <Expandable title="A worked example: five ratings through the average-rating job">
            <p>Input: film 1 rated 4.0, 5.0 and 4.5; film 2 rated 3.0 and 4.0.</p>
            <p>Map: each line becomes key movieId, value “rating,1”: 1 → 4.0,1 · 1 → 5.0,1 · 2 → 3.0,1 · 1 → 4.5,1 · 2 → 4.0,1.</p>
            <p>Combine (on the map side): 1 → 13.5,3 · 2 → 7.0,2.</p>
            <p>Shuffle and sort: each film’s values arrive together at one reducer.</p>
            <p>Reduce: film 1 → 13.5 ÷ 3 = 4.50 from 3 ratings; film 2 → 7.0 ÷ 2 = 3.50 from 2 ratings.</p>
            <Source path={`${JOBS}AverageRatingJob.java`} />
          </Expandable>
          <Expandable title="The seven jobs and their outputs">
            <ul className="list-disc space-y-1 pl-5">
              <li>Average rating per film → avgrating/ (movieId, avgRating, ratingCount)</li>
              <li>Most rated films → mostrated/ (movieId, ratingCount)</li>
              <li>Rating distribution → ratingdist/ (rating, count)</li>
              <li>Genre popularity, map-side join → genrepop/ (genre, movieCount, ratingCount, avgRating)</li>
              <li>Ratings by release year, map-side join → yearrating/ (year, avgRating, ratingCount)</li>
              <li>Hidden gems, Bayesian score, 5–50 ratings, average 4.0 or more → hiddengems/</li>
              <li>Ratings by month → ratingtrends/ (yearMonth, count, avgRating)</li>
            </ul>
            <p>
              Open any output on the <Link to="/hadoop" className="text-accent underline-offset-4 hover:underline">Hadoop page</Link>.
            </p>
          </Expandable>
          <Expandable title="HDFS and YARN in one paragraph each">
            <p>HDFS: a NameNode holds the namespace and block map; DataNodes store replicated 128 MB blocks.</p>
            <p>YARN: a ResourceManager allocates resources, NodeManagers run containers, and each job’s ApplicationMaster drives its tasks.</p>
          </Expandable>
        </div>
      </section>

      <section aria-labelledby="viva-title" className="lit-panel rounded-panel bg-surface-1 p-5 sm:p-6">
        <h2 id="viva-title" className="text-lg font-semibold text-ink">Viva questions</h2>
        <p className="mt-1 max-w-[72ch] text-[15px] leading-relaxed text-ink-2">
          {QUESTIONS.length} likely questions. Answers about this project link to the code they describe; general Hadoop answers
          describe Hadoop’s default behaviour.
        </p>
        <div className="mt-2">
          {QUESTIONS.map((item) => (
            <Expandable key={item.q} title={item.q}>
              {item.a}
            </Expandable>
          ))}
        </div>
      </section>
    </div>
  );
}
