export interface RateLimiter {
  check(key: string): boolean;
}

/**
 * The key a request is limited on, taken from the END of x-forwarded-for.
 * Proxies append, so the last hop is the one Azure's front end added and the
 * only one a caller cannot set; the first is whatever the caller sent. Keying
 * on the first hands a fresh bucket to anyone willing to vary the header,
 * which makes the limit decorative.
 *
 * x-azure-clientip wins where present, because the front end sets it outright.
 * With neither header every caller shares one bucket — the safe direction to
 * fail, since it over-limits rather than under-limits.
 */
export function clientKey(headers: { get(name: string): string | null }): string {
  const azure = headers.get('x-azure-clientip')?.trim();
  if (azure) return azure;

  const hops = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops.at(-1) ?? 'unknown';
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
