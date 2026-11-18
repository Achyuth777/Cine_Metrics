// API connectivity as observed from real requests.
// api.ts reports the outcome of every request here, and the app shell reads it.
// Nothing can set "connected" except a request that actually succeeded.

export type ApiConnectivity =
  | { state: 'unknown' }
  | { state: 'connected'; at: number }
  | { state: 'unreachable'; at: number; detail: string }
  | { state: 'error'; at: number; detail: string };

let current: ApiConnectivity = { state: 'unknown' };
const listeners = new Set<() => void>();

export const apiStatus = {
  get: (): ApiConnectivity => current,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  report(next: ApiConnectivity): void {
    current = next;
    listeners.forEach((listener) => listener());
  }
};
