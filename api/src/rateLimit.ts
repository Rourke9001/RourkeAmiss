export interface RateLimiter {
  check(key: string): boolean;
}

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Strips the port App Service appends, without mangling IPv6.
 *
 * Three shapes arrive here: `1.2.3.4`, `1.2.3.4:53311`, and `[2001:db8::1]:53311`
 * — plus a bare IPv6 with no port. A blind `split(':')[0]` truncates every
 * IPv6 address to `2001`, collapsing unrelated callers into one bucket, so the
 * bracket form is unwrapped first and a bare address is only cut when it holds
 * exactly one colon, which no IPv6 address does.
 */
function stripPort(hop: string): string {
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(hop);
  if (bracketed) return bracketed[1];
  return hop.split(':').length === 2 ? hop.split(':')[0] : hop;
}

function isAddress(value: string): boolean {
  if (IPV4.test(value)) return value.split('.').every((o) => Number(o) <= 255);
  return value.includes(':') && /^[0-9a-f:.]+$/i.test(value);
}

/**
 * The key a request is limited on.
 *
 * Taken from the END of x-forwarded-for, never the start: proxies append, so
 * the last hop is the one Azure's front end added and the only one a caller
 * cannot set. Keying on the first hands a fresh bucket to anyone willing to
 * vary the header, which makes the limit decorative.
 *
 * The port matters as much as the position. App Service writes the hop as
 * `ip:port`, and the source port changes per connection — so keeping it is
 * the same decorative limit by another route, with a bucket per TCP
 * connection. Both headers are therefore stripped to a bare address and
 * rejected unless they look like one, because a key that varies per request
 * is worse than no limit: it also grows the map unboundedly.
 *
 * With no usable header every caller shares one bucket. See the note on
 * verifying this against the real deployment in docs/deployment.md §6.
 */
export function clientKey(headers: { get(name: string): string | null }): string {
  const azure = stripPort(headers.get('x-azure-clientip')?.trim() ?? '');
  if (isAddress(azure)) return azure;

  const hops = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((h) => stripPort(h.trim()))
    .filter(isAddress);
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
      // Sweep expired buckets rather than only the caller's own. Without it
      // every distinct key ever seen is retained for the life of the instance,
      // and the keys are attacker-influenced.
      for (const [k, ts] of hits) {
        if (ts.every((v) => t - v >= opts.windowMs)) hits.delete(k);
      }

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
