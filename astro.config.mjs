// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // Astro emits three inline scripts — the client:visible bootstrap, the island
  // hydration runtime, and the metric-bar animation — plus inline component
  // styles. A `script-src 'self'` header blocks every one of them, which would
  // have shipped a page whose form never hydrates and whose bars never draw.
  // This generates a per-page <meta> CSP carrying the hash of each inline
  // script and style, so the policy stays strict without 'unsafe-inline'.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      // No 'unsafe-inline' here. CSP3 ignores it while any hash is present, so
      // today it protects nothing — but if inline styles ever stop being
      // emitted (build.inlineStylesheets: 'never' is one line away) no hashes
      // are generated and it would silently become the active policy. The
      // hashes are the mechanism; nothing else belongs in this directive.
      styleDirective: { resources: ["'self'"] },
    },
  },
  integrations: [react(), mdx()],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Source Serif 4',
      cssVariable: '--font-serif',
      weights: [400, 600, 700],
      styles: ['normal'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      weights: [400, 500, 600],
      styles: ['normal'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400, 500],
      styles: ['normal'],
    },
  ],
});