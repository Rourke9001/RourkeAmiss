import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The API is its own npm package with its own node_modules, so
      // api/src/email.ts resolves the ACS SDK to api/node_modules while a test
      // at the repo root resolves the same specifier somewhere else — and a
      // vi.mock keyed to a different module id does not intercept, which shows
      // up as the real client being constructed and the test hanging on a
      // network call rather than as a resolution error.
      '@azure/communication-email': fileURLToPath(
        new URL('./api/node_modules/@azure/communication-email', import.meta.url),
      ),
    },
  },
  test: { environment: 'jsdom', globals: true },
});
