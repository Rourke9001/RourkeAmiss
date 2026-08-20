import { useState } from 'react';

/**
 * The request-CV form. The CV is not published as a file anywhere on this site
 * — this posts to /api/request-cv, which emails Rourke, and he replies with a
 * copy tailored to the role.
 *
 * Native `required` and `type="email"` do the first pass of validation before
 * any JavaScript runs, and the API validates again regardless: the client is a
 * convenience, never the check. The `website` field is a honeypot — a real
 * browser leaves it empty, and the API answers 202 to a filled one so a bot
 * cannot tell a drop from a success.
 */

type State = 'idle' | 'sending' | 'done' | 'error' | 'rate-limited';

const RECIPIENT = 'rourke9001@gmail.com';

export function RequestCv() {
  const [state, setState] = useState<State>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch('/api/request-cv', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.status === 429) return setState('rate-limited');
      if (!response.ok) return setState('error');
      form.reset();
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="request-done" role="status">
        Request received. Rourke will reply from {RECIPIENT}.
      </p>
    );
  }

  return (
    <form className="request-form" onSubmit={onSubmit} noValidate={false}>
      <p className="request-lede">
        The CV is not published here. Ask and it comes back tailored to the role.
      </p>

      <div className="field">
        <label htmlFor="rq-name">Your name</label>
        <input id="rq-name" name="name" type="text" required maxLength={120} autoComplete="name" />
      </div>

      <div className="field">
        <label htmlFor="rq-email">Email</label>
        <input id="rq-email" name="email" type="email" required maxLength={200} autoComplete="email" />
      </div>

      <div className="field">
        <label htmlFor="rq-company">
          Company <span className="optional">optional</span>
        </label>
        <input id="rq-company" name="company" type="text" maxLength={200} autoComplete="organization" />
      </div>

      <div className="field">
        <label htmlFor="rq-role">
          Role <span className="optional">optional</span>
        </label>
        <input id="rq-role" name="role" type="text" maxLength={200} />
      </div>

      <div className="field">
        <label htmlFor="rq-message">
          Anything about the role <span className="optional">optional</span>
        </label>
        <textarea id="rq-message" name="message" rows={4} maxLength={5000} />
      </div>

      {/* Honeypot. Hidden from sight and from assistive technology, and skipped
          by the tab order, so only a form-filling bot ever populates it. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="rq-website">Website</label>
        <input id="rq-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Request the CV'}
      </button>

      <p className="request-status" role="status" aria-live="polite">
        {state === 'rate-limited' &&
          'That is several requests in a short time. Try again in an hour, or email directly.'}
        {state === 'error' &&
          `Something went wrong sending that. Email ${RECIPIENT} directly and it will reach him.`}
      </p>
    </form>
  );
}
