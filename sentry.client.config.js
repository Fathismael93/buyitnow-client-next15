import * as Sentry from '@sentry/nextjs';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Common ignore rules
  ignoreErrors: [
    // Network errors that often happen during navigation
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    'TypeError: Failed to fetch',
    'Load failed',

    // Common React issues
    'ResizeObserver loop limit exceeded',
    'Loading chunk',
    'ChunkLoadError',
    'Loading CSS chunk',

    // Navigation errors
    'Minified React error',
    'Canceled',
    'Operation was aborted',
    'Cannot read property',
    'null is not an object',
    'undefined is not an object',
    'Object Not Found Matching Id',

    // Client-side navigation
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
    'prefetch',
    'cancel rendering route',
  ],

  // Patterns to ignore
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,

    // External services
    /googlesyndication\.com/,
    /adservice\.google\./,
    /google-analytics\.com/,
    /googletagmanager\.com/,
    /hotjar\.com/,
    /facebook\.net/,
  ],

  // Anonymize user data
  beforeSend(event) {
    // Remove personal data
    if (event.user) {
      delete event.user.ip_address;
      if (event.user.email) {
        event.user.email = 'anonymized@example.com';
      }
    }

    // Filter out URL parameters that might contain sensitive data
    if (event.request && event.request.url) {
      try {
        const url = new URL(event.request.url);
        if (
          url.searchParams.has('token') ||
          url.searchParams.has('password') ||
          url.searchParams.has('accessToken')
        ) {
          url.searchParams.set('token', '[FILTERED]');
          url.searchParams.set('password', '[FILTERED]');
          url.searchParams.set('accessToken', '[FILTERED]');
          event.request.url = url.toString();
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // URL parsing failed, leave the original URL
      }
    }

    return event;
  },

  integrations: [
    new Replay({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],
});
