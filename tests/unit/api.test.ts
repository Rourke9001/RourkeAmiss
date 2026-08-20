import { describe, it, expect, vi } from 'vitest';
import { validateRequest } from '../../api/src/validate';
import { createRateLimiter } from '../../api/src/rateLimit';
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
