import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleRequest } from '../handler';
import { createRateLimiter } from '../rateLimit';
import { sendViaAcs } from '../email';

const limiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

app.http('requestCv', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'request-cv',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { errors: ['invalid JSON'] } };
    }

    try {
      const res = await handleRequest({ body, ip, limiter, send: sendViaAcs });
      return { status: res.status, jsonBody: res.body };
    } catch (err) {
      context.error('request-cv failed', err);
      return { status: 502, jsonBody: { error: 'Could not deliver the request' } };
    }
  },
});
