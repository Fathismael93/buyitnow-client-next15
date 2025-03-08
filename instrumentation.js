// instrumentation.js
import { EventEmitter } from 'events';

// Augmenter la limite d'écouteurs d'événements pour éviter l'avertissement
if (typeof EventEmitter !== 'undefined') {
  EventEmitter.defaultMaxListeners = 20;
}

// Fonction pour valider le format d'un DSN Sentry
function isValidDSN(dsn) {
  if (!dsn) return false;
  // Format approximatif d'un DSN valide: https://{PUBLIC_KEY}@{HOST}/{PROJECT_ID}
  return /^https:\/\/[^@]+@[^/]+\/\d+$/.test(dsn);
}

export async function register() {
  const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (sentryDSN && isValidDSN(sentryDSN)) {
    try {
      const Sentry = await import('@sentry/nextjs');

      Sentry.init({
        dsn: sentryDSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: false,
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
          'DEPTH_ZERO_SELF_SIGNED_CERT',
          'getaddrinfo ENOTFOUND',
          'getaddrinfo EAI_AGAIN',
          'database timeout',
          'read ECONNRESET',
          'connect ETIMEDOUT',
          'MongoNetworkError',
          'MongoError',
        ],

        // Anonymiser des données sensibles
        beforeSend(event) {
          // Anonymiser les headers
          if (event.request && event.request.headers) {
            const sanitizedHeaders = { ...event.request.headers };

            // Supprimer les données sensibles des headers
            if (sanitizedHeaders.cookie) sanitizedHeaders.cookie = '[FILTERED]';
            if (sanitizedHeaders.authorization)
              sanitizedHeaders.authorization = '[FILTERED]';
            if (sanitizedHeaders['x-auth-token'])
              sanitizedHeaders['x-auth-token'] = '[FILTERED]';

            event.request.headers = sanitizedHeaders;
          }

          // Anonymiser les cookies
          if (event.request && event.request.cookies) {
            event.request.cookies = '[FILTERED]';
          }

          // Anonymiser les données utilisateurs
          if (event.user) {
            if (event.user.email) event.user.email = '[FILTERED]';
            if (event.user.id)
              event.user.id =
                event.user.id.substring(0, 2) + '...' + event.user.id.slice(-2);
            if (event.user.ip_address) event.user.ip_address = '[FILTERED]';
          }

          return event;
        },
      });
      console.log('Sentry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  } else {
    console.warn(
      'Invalid or missing Sentry DSN. Sentry will not be initialized.',
    );
  }
}

// Ajout de l'instrumentation onRequestError pour les composants serveur React
export function onRequestError({ error, request }) {
  try {
    // Importer Sentry de manière synchrone pour l'accès au hook onRequestError
    const Sentry = require('@sentry/nextjs');

    // Capturer l'erreur avec des informations sur la requête
    Sentry.captureRequestError(error, request);
  } catch (e) {
    console.error('Error in onRequestError:', e);
  }
}
