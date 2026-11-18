import { useCallback, useEffect, useRef, useState } from 'react';

type Settled<T> = { runKey: string; ok: true; data: T } | { runKey: string; ok: false; error: unknown };

export type QueryResult<T> =
  | { status: 'idle'; data: undefined; error: undefined; retry: () => void }
  | { status: 'loading'; data: undefined; error: undefined; retry: () => void }
  | { status: 'ready'; data: T; error: undefined; retry: () => void }
  | { status: 'error'; data: undefined; error: unknown; retry: () => void };

/**
 * Runs `fetcher` whenever `key` changes and reports one of four states, so every
 * route can draw loading, ready and failed differently. A stale response never
 * overwrites a newer one: the previous request is aborted and its result ignored.
 * Pass `null` as the key to stay idle. `retry` runs the same request again.
 */
export function useQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): QueryResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // Always call the latest fetcher without making it a dependency of the request.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const runKey = key === null ? null : `${attempt}|${key}`;

  useEffect(() => {
    if (runKey === null) return undefined;
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ runKey, ok: true, data });
      },
      (error) => {
        if (!controller.signal.aborted) setSettled({ runKey, ok: false, error });
      }
    );
    return () => controller.abort();
  }, [runKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (runKey === null) return { status: 'idle', data: undefined, error: undefined, retry };
  if (!settled || settled.runKey !== runKey) return { status: 'loading', data: undefined, error: undefined, retry };
  if (settled.ok) return { status: 'ready', data: settled.data, error: undefined, retry };
  return { status: 'error', data: undefined, error: settled.error, retry };
}
