import { describe, it, expect, vi } from 'vitest';
import { validateRequest } from '../../api/src/validate';
import { createRateLimiter, clientKey } from '../../api/src/rateLimit';
import { handleRequest, RECIPIENT } from '../../api/src/handler';

const valid = { name: 'Jane Doe', email: 'jane@acme.com', company: 'Acme', role: 'Software Engineer', message: 'Please send your CV.', website: '' };
const limiter = () => createRateLimiter({ max: 3, windowMs: 60_000 });

describe('validateRequest', () => {
  it('accepts a well-formed request', () => {
    expect(validateRequest(valid).ok).toBe(true);
  });
  it('rejects a malformed email', () => {
    const r = validateRequest({ ...valid, email: 'not-an-email' });
    expect(r.ok).toBe(false);
  });
  it('rejects a missing name', () => {
    expect(validateRequest({ ...valid, name: '' }).ok).toBe(false);
  });
  it('rejects an overlong message', () => {
    expect(validateRequest({ ...valid, message: 'x'.repeat(5001) }).ok).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit then refuses', () => {
    const l = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(false);
  });
  it('keeps separate budgets per key', () => {
    const l = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('2.2.2.2')).toBe(true);
  });
  it('forgets once the window passes', () => {
    let t = 0;
    const l = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(false);
    t = 1001;
    expect(l.check('1.1.1.1')).toBe(true);
  });
});

describe('handleRequest', () => {
  it('sends exactly one email and returns 202', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: valid, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(202);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('always sends to the hardcoded recipient', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await handleRequest({ body: { ...valid, email: 'attacker@evil.com' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(send.mock.calls[0][0].to).toBe(RECIPIENT);
  });

  it('sets reply-to to the requester so a reply reaches them', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await handleRequest({ body: valid, ip: '1.1.1.1', limiter: limiter(), send });
    expect(send.mock.calls[0][0].replyTo).toBe('jane@acme.com');
  });

  it('drops a honeypot submission silently without sending', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: { ...valid, website: 'http://spam.example' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(202);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid input without sending', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: { ...valid, email: 'nope' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 429 once the rate limit is exhausted', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const l = createRateLimiter({ max: 1, windowMs: 60_000 });
    await handleRequest({ body: valid, ip: '1.1.1.1', limiter: l, send });
    const res = await handleRequest({ body: valid, ip: '1.1.1.1', limiter: l, send });
    expect(res.status).toBe(429);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('clientKey', () => {
  const headers = (h: Record<string, string>) => ({
    get: (name: string) => h[name.toLowerCase()] ?? null,
  });

  it('prefers x-azure-clientip, which a caller cannot set', () => {
    expect(
      clientKey(headers({ 'x-azure-clientip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' })),
    ).toBe('9.9.9.9');
  });

  it('takes the last forwarded hop, not the caller-supplied first', () => {
    expect(clientKey(headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' }))).toBe('3.3.3.3');
  });

  it('gives a spoofed leading hop no effect on the bucket', () => {
    const a = clientKey(headers({ 'x-forwarded-for': 'spoof-a, 3.3.3.3' }));
    const b = clientKey(headers({ 'x-forwarded-for': 'spoof-b, 3.3.3.3' }));
    expect(a).toBe(b);
  });

  // App Service writes the hop as ip:port. The port changes per connection, so
  // keeping it would put every request in its own bucket and never rate-limit.
  it('strips the port App Service appends, so one caller keeps one bucket', () => {
    const first = clientKey(headers({ 'x-forwarded-for': '41.13.5.2:53311' }));
    const second = clientKey(headers({ 'x-forwarded-for': '41.13.5.2:61004' }));
    expect(first).toBe('41.13.5.2');
    expect(first).toBe(second);
  });

  it('strips the port from x-azure-clientip too', () => {
    expect(clientKey(headers({ 'x-azure-clientip': '41.13.5.2:443' }))).toBe('41.13.5.2');
  });

  it('does not truncate an IPv6 address to its first group', () => {
    expect(clientKey(headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(clientKey(headers({ 'x-forwarded-for': '[2001:db8::1]:53311' }))).toBe('2001:db8::1');
  });

  it('keeps two different IPv6 callers in different buckets', () => {
    const a = clientKey(headers({ 'x-forwarded-for': '[2001:db8::1]:1' }));
    const b = clientKey(headers({ 'x-forwarded-for': '[2001:db8::2]:1' }));
    expect(a).not.toBe(b);
  });

  it('ignores a header that is not an address rather than keying on it', () => {
    expect(clientKey(headers({ 'x-azure-clientip': 'not-an-ip' }))).toBe('unknown');
    expect(clientKey(headers({ 'x-forwarded-for': 'garbage, 999.999.999.999' }))).toBe('unknown');
  });

  it('falls back to a single shared bucket when no header identifies the caller', () => {
    expect(clientKey(headers({}))).toBe('unknown');
    expect(clientKey(headers({ 'x-forwarded-for': '  ,  ' }))).toBe('unknown');
  });
});

describe('createRateLimiter eviction', () => {
  it('does not retain buckets after their window has passed', () => {
    let t = 0;
    const l = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
    for (let i = 0; i < 50; i++) {
      t = i * 2000;
      l.check(`10.0.0.${i}`);
    }
    // The 50th caller is still limited on its own key, proving the sweep
    // dropped stale buckets rather than everything.
    expect(l.check('10.0.0.49')).toBe(false);
  });
});
