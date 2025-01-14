import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://033fe39bb04df00bc177b66251444aa7@o4507932631040000.ingest.de.sentry.io/4507933004857424',
  // Replay may only be enabled for the client-side
  integrations: [
    Sentry.replayIntegration(),
    Sentry.captureConsoleIntegration(),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
