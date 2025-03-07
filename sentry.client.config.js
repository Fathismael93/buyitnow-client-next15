// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print helpful debug information to the console
  debug: process.env.NODE_ENV === 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  replaysOnErrorSampleRate: 1.0,

  // Common ignore rules
  ignoreErrors: [
    // Network errors that often happen during navigation
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    'TypeError: Failed to fetch',

    // Common React issues
    'ResizeObserver loop limit exceeded',
    'Loading chunk',
    'ChunkLoadError',
    'Loading CSS chunk',

    // Navigation errors
    'Minified React error',
    'Canceled',
    'Operation was aborted',
  ],

  integrations: [
    new Sentry.Replay({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
