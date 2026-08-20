export interface RateLimiter {
  check(key: string): boolean;
}

/**
 * Per-instance memory, which is the correct trade for this endpoint: a cold
 * instance forgets, but the cost of a forgotten window is one extra email.
 */
export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();
  return {
    check(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < opts.windowMs);
      if (recent.length >= opts.max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
  };
}
