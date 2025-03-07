// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // Common server-side ignore rules
  ignoreErrors: [
    'Connection refused',
    'Connection reset',
    'ECONNREFUSED',
    'ECONNRESET',
    'socket hang up',
    'ETIMEDOUT',
    'Unexpected token',
  ],

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express(),
    new Sentry.Integrations.Mongo(),
  ],

  // You can filter out certain users' data
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.headers?.cookie) {
      event.request.headers.cookie = '[Filtered]';
    }

    if (event.request?.cookies) {
      event.request.cookies = '[Filtered]';
    }

    // Filter out any user data
    if (event.user?.email) {
      event.user.email = '[Filtered]';
    }

    return event;
  },
});
