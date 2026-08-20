import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleRequest } from '../handler';
import { createRateLimiter, clientKey } from '../rateLimit';
import { sendViaAcs } from '../email';

const limiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

app.http('requestCv', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'request-cv',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const ip = clientKey(request.headers);
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
