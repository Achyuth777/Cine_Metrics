import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { buttonClass } from './system/buttonClass';

// The three states every data-driven view can be in besides "ready". They are
// built to look different at a glance: loading is a quiet line with a spinner,
// empty is a dashed neutral outline with centred text, and failure is a solid
// panel with a red-tinted outline, a warning icon and a Retry button.

/** Shown while a request is in flight. */
export function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-ink-2">
      <span
        className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent"
        aria-hidden="true"
      />
      {text}
    </div>
  );
}

type ErrorStateProps = {
  /** What failed, in a few words. */
  title?: string;
  /** Why, and what the visitor can do. */
  message: string;
  onRetry?: () => void;
};

/** Shown when a request failed. Never used for "no results". */
export function ErrorState({ title = 'Couldn’t load this data', message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-panel border border-danger/60 bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonClass({ variant: 'secondary' })}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

type EmptyStateProps = {
  title?: string;
  message?: string;
  /** For example a "Reset filters" button. */
  action?: ReactNode;
};

/** Shown when a request succeeded and returned nothing. */
export function EmptyState({
  title = 'Nothing matches',
  message = 'Try a different search, or loosen the filters.',
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="max-w-[48ch] text-sm leading-relaxed text-ink-2">{message}</p>
      {action}
    </div>
  );
}
