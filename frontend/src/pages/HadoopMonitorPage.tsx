import { useId, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { api } from '../api';
import { EmptyState, ErrorState, LoadingSpinner } from '../components/LoadingState';
import Dialog from '../components/system/Dialog';
import PageHeader from '../components/system/PageHeader';
import { buttonClass } from '../components/system/buttonClass';
import { useQuery } from '../hooks/useQuery';
import { describeError, formatCount, formatDateTime } from '../lib/format';

const PANEL = 'lit-panel rounded-panel bg-surface-1 p-5 sm:p-6';
const TITLE = 'text-lg font-semibold text-ink';

/**
 * The seven output folders the API can read, in pipeline order. Names and
 * schemas as listed in backend/routers/hadoop.py; job classes in
 * hadoop/src/main/java/com/cinemetrics/mapreduce/.
 */
const OUTPUTS = [
  { job: 'avgrating', name: 'Average rating per film', source: 'AverageRatingJob.java', columns: ['movieId', 'avgRating', 'ratingCount'] },
  { job: 'mostrated', name: 'Most rated films', source: 'MostRatedJob.java', columns: ['movieId', 'ratingCount'] },
  { job: 'ratingdist', name: 'Rating distribution', source: 'RatingDistributionJob.java', columns: ['rating', 'count'] },
  { job: 'genrepop', name: 'Genre popularity', source: 'GenrePopularityJob.java', columns: ['genre', 'movieCount', 'ratingCount', 'avgRating'] },
  { job: 'yearrating', name: 'Ratings by release year', source: 'YearRatingJob.java', columns: ['year', 'avgRating', 'ratingCount'] },
  { job: 'hiddengems', name: 'Hidden gems', source: 'HiddenGemsJob.java', columns: ['movieId', 'avgRating', 'ratingCount', 'score'] },
  { job: 'ratingtrends', name: 'Ratings by month', source: 'RatingTrendsJob.java', columns: ['yearMonth', 'count', 'avgRating'] }
];

/** A row in an "about this" list. Missing values say so instead of disappearing. */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className={value ? 'text-ink' : 'text-ink-2 italic'}>{value || 'Not recorded'}</dd>
    </div>
  );
}

function ClusterStatus() {
  const status = useQuery('hadoop-status', () => api.getHadoopStatus());
  const action = (
    <button type="button" onClick={status.retry} disabled={status.status === 'loading'} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
      <RefreshCw className="size-3.5" aria-hidden="true" />
      Check again
    </button>
  );
  let body;
  if (status.status === 'error') {
    const failure = describeError(status.error, 'the cluster status');
    body = <ErrorState title={failure.title} message={failure.message} onRetry={status.retry} />;
  } else if (status.status !== 'ready') {
    body = <LoadingSpinner text="Checking for a cluster. This can take a few seconds when none answers…" />;
  } else {
    const s = status.data;
    body = (
      <>
        <p className="flex items-center gap-2.5 text-base font-semibold text-ink">
          <span className={`size-2.5 shrink-0 rounded-full ${s.connected ? 'bg-ok' : 'bg-ink-2'}`} aria-hidden="true" />
          {s.connected ? 'A Hadoop cluster answered' : 'No Hadoop cluster is connected'}
        </p>
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
          {s.connected
            ? 'The API reached the cluster’s web interfaces when it checked. Figures in this app still come from the stored output files below.'
            : 'The API tried the HDFS NameNode (port 9870) and YARN ResourceManager (port 8088) and got no answer. That does not affect the rest of the app: every page reads the stored output files below.'}
        </p>
        <dl className="mt-4 text-sm">
          <Fact label="Checked at" value={s.telemetryObservedAt ? formatDateTime(s.telemetryObservedAt) : null} />
          {s.connected && <Fact label="Active nodes" value={s.activeNodes != null ? String(s.activeNodes) : null} />}
          {s.connected && <Fact label="Hadoop version" value={s.clusterVersion} />}
        </dl>
      </>
    );
  }
  return (
    <section aria-labelledby="cluster-title" className={PANEL}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="cluster-title" className={TITLE}>Live cluster</h2>
        {action}
      </div>
      {body}
    </section>
  );
}

function JobHistory() {
  const jobs = useQuery('hadoop-jobs', () => api.getHadoopJobs());
  let body;
  if (jobs.status === 'error') {
    const failure = describeError(jobs.error, 'the job history');
    body = <ErrorState title={failure.title} message={failure.message} onRetry={jobs.retry} />;
  } else if (jobs.status !== 'ready') {
    body = <LoadingSpinner text="Loading the job history…" />;
  } else if (jobs.data.jobs.length === 0) {
    body = (
      <EmptyState
        title="No job runs are recorded"
        message={`This copy has no record of when the jobs ran (data/processed/jobs.json is missing). The output files below were produced by the engine the API reports: ${jobs.data.engine}.`}
      />
    );
  } else {
    body = (
      <div className="relative overflow-x-auto" role="region" aria-label="Recorded job runs, scrollable table" tabIndex={0}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Recorded job runs, as stored in data/processed/jobs.json.</caption>
          <thead className="text-[13px] text-ink-2">
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pr-3 font-medium">Job</th>
              <th scope="col" className="px-2 py-2 font-medium">Result</th>
              <th scope="col" className="px-2 py-2 font-medium">Started</th>
              <th scope="col" className="px-2 py-2 font-medium">Took</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Records in</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Records out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {jobs.data.jobs.map((job) => (
              <tr key={job.jobId}>
                <th scope="row" className="py-2.5 pr-3 font-medium text-ink">
                  {job.jobName}
                  <span className="block text-[13px] font-normal text-ink-2">{job.jobId}</span>
                </th>
                <td className="px-2 py-2.5 text-ink">{job.status}</td>
                <td className="px-2 py-2.5 text-ink-2">{job.startTime ? formatDateTime(job.startTime) : 'Not recorded'}</td>
                <td className="px-2 py-2.5 text-ink-2">{job.duration ?? 'Not recorded'}</td>
                <td className="px-2 py-2.5 text-right text-ink">{job.inputRecords != null ? formatCount(job.inputRecords) : '—'}</td>
                <td className="py-2.5 pl-2 text-right text-ink">{job.outputRecords != null ? formatCount(job.outputRecords) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <section aria-labelledby="history-title" className={PANEL}>
      <h2 id="history-title" className={TITLE}>Job history</h2>
      <p className="mb-4 mt-1 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">Past runs, as recorded when the jobs were run. Nothing here is live.</p>
      {body}
    </section>
  );
}

function OutputPreview({ job, onClose }: { job: (typeof OUTPUTS)[number]; onClose: () => void }) {
  const titleId = useId();
  const preview = useQuery(`preview:${job.job}`, () => api.getPartitionOutputPreview(job.job, 25));
  return (
    <Dialog open onClose={onClose} labelledBy={titleId}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-ink">{job.name}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">data/processed/{job.job}/, first 25 lines</p>
        </div>
        <button type="button" onClick={onClose} className={buttonClass({ variant: 'quiet', size: 'icon' })} aria-label="Close">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {preview.status === 'error' && (() => {
          const failure = describeError(preview.error, 'this output file');
          return <ErrorState title={failure.title} message={failure.message} onRetry={preview.retry} />;
        })()}
        {preview.status === 'loading' && <LoadingSpinner text="Reading the file…" />}
        {preview.status === 'ready' && (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
              <Fact label="File" value={preview.data.fileName} />
              <Fact label="Size" value={`${formatCount(Math.round(preview.data.fileSizeBytes / 1024))} KB`} />
              <Fact label="Part files" value={String(preview.data.totalPartitions)} />
            </dl>
            <div className="relative overflow-x-auto rounded-control bg-canvas" role="region" aria-label="File lines, scrollable table" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">The first {preview.data.sampleLinesCount} lines, split at each tab into columns.</caption>
                <thead className="text-[13px] text-ink-2">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pl-4 pr-3 font-medium">Line</th>
                    {job.columns.map((column) => (
                      <th key={column} scope="col" className="px-3 py-2 font-medium">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.data.sampleLines.map((line, index) => (
                    <tr key={index}>
                      <td className="py-1.5 pl-4 pr-3 text-ink-2">{index + 1}</td>
                      {line.split('\t').map((cell, cellIndex) => (
                        <td key={cellIndex} className="whitespace-nowrap px-3 py-1.5 text-ink">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-ink-2">Each line in the file is one reducer output record, with tabs between fields.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}

function StoredOutputs() {
  const [open, setOpen] = useState<(typeof OUTPUTS)[number] | null>(null);
  return (
    <section aria-labelledby="outputs-title" className={PANEL}>
      <h2 id="outputs-title" className={TITLE}>Stored outputs</h2>
      <p className="mb-4 mt-1 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
        The result files every page of this app reads, one folder per job, under <code className="text-ink">data/processed/</code>. Open
        one to see its first lines exactly as written.
      </p>
      <ul className="divide-y divide-line">
        {OUTPUTS.map((output) => (
          <li key={output.job} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{output.name}</p>
              <p className="text-[13px] text-ink-2">
                {output.job}/ · {output.columns.join(', ')} · written by {output.source}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(output)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              Show first lines<span className="sr-only"> of {output.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && <OutputPreview job={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Provenance() {
  const overview = useQuery('overview', () => api.getOverview());
  if (overview.status === 'error') {
    const failure = describeError(overview.error, 'provenance details');
    return <ErrorState title={failure.title} message={failure.message} onRetry={overview.retry} />;
  }
  if (overview.status !== 'ready') return <LoadingSpinner text="Loading provenance…" />;
  const o = overview.data;
  return (
    <dl className="text-sm">
      <Fact label="Dataset" value={`${o.datasetInfo.name}, ${formatCount(o.datasetInfo.records)} ratings`} />
      <Fact label="Source" value={o.datasetInfo.source} />
      <Fact label="Engine that produced the outputs, as the API reports it" value={o.engine} />
      <Fact label="Loaded into the API" value={o.apiLoadedAt ? formatDateTime(o.apiLoadedAt) : null} />
    </dl>
  );
}

export default function HadoopMonitorPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Hadoop"
        description="Three separate things: whether a Hadoop cluster is reachable right now, which job runs were recorded, and the stored output files the app reads."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClusterStatus />
        <section aria-labelledby="provenance-title" className={PANEL}>
          <h2 id="provenance-title" className={`${TITLE} mb-3`}>Where the numbers come from</h2>
          <Provenance />
        </section>
      </div>
      <StoredOutputs />
      <JobHistory />
      <section aria-labelledby="run-title" className={PANEL}>
        <h2 id="run-title" className={TITLE}>Running the jobs on a cluster</h2>
        <p className="mt-1 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
          Build the jobs with <code className="text-ink">mvn clean package</code> in <code className="text-ink">hadoop/</code>, then run{' '}
          <code className="text-ink">scripts/run_hadoop_jobs.sh</code>. It copies the two CSV files into HDFS, runs the seven jobs with{' '}
          <code className="text-ink">hadoop jar</code>, and lists the output folders. Copy those folders into <code className="text-ink">data/processed/</code>{' '}
          and restart the API to serve them.
        </p>
      </section>
    </div>
  );
}
