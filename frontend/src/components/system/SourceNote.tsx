import clsx from 'clsx';
import { formatDate } from '../../lib/format';

type SourceNoteProps = {
  source: 'live' | 'demo';
  /** ISO date the demo sample was recorded. */
  recordedOn?: string;
  className?: string;
};

/** Says whether the figures on screen are live or the recorded sample. Demo data is always labelled. */
export default function SourceNote({ source, recordedOn, className }: SourceNoteProps) {
  if (source === 'live') {
    return (
      <p className={clsx('flex items-center gap-2 text-[13px] text-ink-2', className)}>
        <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />
        Live from the CineMetrics API
      </p>
    );
  }
  return (
    <p className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2', className)}>
      <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">Demo data</span>
      Recorded on {formatDate(recordedOn ?? '')}. The API isn’t connected right now.
    </p>
  );
}
