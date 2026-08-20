import { validateRequest } from './validate';
import type { RateLimiter } from './rateLimit';

/**
 * The recipient is a constant, never taken from the request. A request-CV form
 * whose destination is caller-controlled is an open relay.
 */
export const RECIPIENT = 'rourke9001@gmail.com';

export type SendEmail = (msg: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}) => Promise<void>;

export async function handleRequest(deps: {
  body: unknown;
  ip: string;
  limiter: RateLimiter;
  send: SendEmail;
}): Promise<{ status: number; body?: unknown }> {
  const parsed = validateRequest(deps.body);
  if (!parsed.ok) return { status: 400, body: { errors: parsed.errors } };

  // Honeypot: a real browser leaves this hidden field empty. Answer 202 so a
  // bot cannot distinguish a drop from a success and retry with a variation.
  if (parsed.data.website.trim() !== '') return { status: 202 };

  if (!deps.limiter.check(deps.ip)) return { status: 429, body: { error: 'Too many requests' } };

  const { name, email, company, role, message } = parsed.data;
  await deps.send({
    to: RECIPIENT,
    replyTo: email,
    subject: `CV request: ${name}${company ? ` — ${company}` : ''}`,
    text: [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Company: ${company || '—'}`,
      `Role:    ${role || '—'}`,
      '',
      message || '(no message)',
    ].join('\n'),
  });

  return { status: 202 };
}
