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

// Fonction pour détecter les données sensibles
function containsSensitiveData(str) {
  if (!str || typeof str !== 'string') return false;

  // Patterns pour détecter les données sensibles
  const patterns = [
    /password/i,
    /mot\s*de\s*passe/i,
    /credit\s*card/i,
    /carte\s*de\s*credit/i,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Numéros de carte
    /\b(?:\d{3}[- ]?){2}\d{4}\b/, // Numéros de téléphone
    /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/, // SSN
    /auth\s*token/i,
    /jwt/i,
    /api[-_]?key/i,
    /secret[-_]?key/i,
  ];

  return patterns.some((pattern) => pattern.test(str));
}

// Classification des erreurs par catégorie
function categorizeError(error) {
  if (!error) return 'unknown';

  const message = error.message || '';
  const name = error.name || '';

  if (/mongo|database|db|connection|timeout/i.test(message + name)) {
    return 'database';
  }

  if (/network|fetch|http|request|response|api/i.test(message + name)) {
    return 'network';
  }

  if (/auth|permission|token|unauthorized|forbidden/i.test(message + name)) {
    return 'authentication';
  }

  if (/validation|schema|required|invalid/i.test(message + name)) {
    return 'validation';
  }

  return 'application';
}

export async function register() {
  const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  if (sentryDSN && isValidDSN(sentryDSN)) {
    try {
      const Sentry = await import('@sentry/nextjs');

      Sentry.init({
        dsn: sentryDSN,
        environment,
        release: process.env.NEXT_PUBLIC_VERSION || '0.1.0',
        tracesSampleRate: isProduction ? 0.1 : 1.0,
        debug: !isProduction,
        enabled: isProduction,

        // Activer le monitoring des performances
        enableTracing: true,

        // Échantillonner les transactions par type
        tracesSampler: (samplingContext) => {
          const name = samplingContext.transactionContext?.name || '';

          // Transactions critiques: 100% des échantillons
          if (
            name.includes('/api/payment') ||
            name.includes('/api/checkout') ||
            name.includes('/api/auth/signin')
          ) {
            return 1.0;
          }

          // API routes: 20% des échantillons
          if (name.includes('/api/')) {
            return 0.2;
          }

          // Pages d'admin: 50% des échantillons
          if (name.includes('/admin')) {
            return 0.5;
          }

          // Toutes les autres transactions: 5% par défaut
          return 0.05;
        },

        // Common server-side ignore rules
        ignoreErrors: [
          // Erreurs réseau
          'Connection refused',
          'Connection reset',
          'ECONNREFUSED',
          'ECONNRESET',
          'socket hang up',
          'ETIMEDOUT',
          'read ECONNRESET',
          'connect ETIMEDOUT',

          // Erreurs de parsing
          'Unexpected token',
          'SyntaxError',
          'JSON.parse',

          // Erreurs de certificat
          'DEPTH_ZERO_SELF_SIGNED_CERT',
          'CERT_HAS_EXPIRED',
          'ssl3_get_server_certificate',

          // Erreurs de DNS
          'getaddrinfo ENOTFOUND',
          'getaddrinfo EAI_AGAIN',

          // Erreurs de base de données
          'database timeout',
          'MongoNetworkError',
          'MongoError',
          'SequelizeConnectionError',

          // Erreurs Next.js
          'NEXT_REDIRECT',
          'NEXT_NOT_FOUND',
          'Cancelled',
          'Route cancelled',

          // Erreurs d'opérations abandonnées
          'AbortError',
          'Operation was aborted',
        ],

        // Améliorer la capture de contexte
        beforeBreadcrumb(breadcrumb, hint) {
          // Éviter d'enregistrer des informations sensibles dans les breadcrumbs
          if (
            ['xhr', 'fetch'].includes(breadcrumb.category) &&
            breadcrumb.data
          ) {
            // Vérifier et filtrer les URL
            if (
              breadcrumb.data.url &&
              containsSensitiveData(breadcrumb.data.url)
            ) {
              const urlObj = new URL(breadcrumb.data.url);
              breadcrumb.data.url = `${urlObj.origin}${urlObj.pathname}`;
              breadcrumb.data.params = '[CONTIENT DES DONNÉES SENSIBLES]';
            }

            // Vérifier et filtrer les corps de requête
            if (
              breadcrumb.data.body &&
              containsSensitiveData(breadcrumb.data.body)
            ) {
              try {
                if (typeof breadcrumb.data.body === 'string') {
                  const parsedBody = JSON.parse(breadcrumb.data.body);
                  breadcrumb.data.body = '[CONTIENT DES DONNÉES SENSIBLES]';
                  breadcrumb.data.bodySize = JSON.stringify(parsedBody).length;
                }
              } catch (e) {
                breadcrumb.data.body = '[DONNÉES FILTRÉES]';
              }
            }
          }

          return breadcrumb;
        },

        // Anonymiser des données sensibles
        beforeSend(event, hint) {
          const error = hint && hint.originalException;

          // Ajouter la catégorie d'erreur
          if (error) {
            event.tags = event.tags || {};
            event.tags.error_category = categorizeError(error);
          }

          // Anonymiser les headers
          if (event.request && event.request.headers) {
            const sanitizedHeaders = { ...event.request.headers };
            const sensitiveHeaders = [
              'cookie',
              'authorization',
              'x-auth-token',
              'session',
              'x-api-key',
              'token',
            ];

            sensitiveHeaders.forEach((header) => {
              if (sensitizedHeaders[header]) {
                sensitizedHeaders[header] = '[FILTERED]';
              }
            });

            event.request.headers = sensitizedHeaders;
          }

          // Anonymiser les cookies
          if (event.request && event.request.cookies) {
            event.request.cookies = '[FILTERED]';
          }

          // Anonymiser les données utilisateurs
          if (event.user) {
            // Supprimer totalement les informations très sensibles
            delete event.user.ip_address;
            delete event.user.username;

            // Anonymiser les identifiants
            if (event.user.email) {
              const atIndex = event.user.email.indexOf('@');
              if (atIndex > 0) {
                const domain = event.user.email.slice(atIndex);
                event.user.email = `${event.user.email[0]}***${domain}`;
              } else {
                event.user.email = '[FILTERED]';
              }
            }

            if (event.user.id) {
              event.user.id =
                event.user.id.substring(0, 2) + '...' + event.user.id.slice(-2);
            }
          }

          // Anonymiser les URL avec paramètres sensibles
          if (event.request && event.request.url) {
            try {
              const url = new URL(event.request.url);
              const sensitiveParams = [
                'token',
                'password',
                'accessToken',
                'key',
                'secret',
                'auth',
              ];

              let hasFilteredParams = false;
              sensitiveParams.forEach((param) => {
                if (url.searchParams.has(param)) {
                  url.searchParams.set(param, '[FILTERED]');
                  hasFilteredParams = true;
                }
              });

              if (hasFilteredParams) {
                event.request.url = url.toString();
              }
            } catch (e) {
              // URL parsing failed, laisser l'original
            }
          }

          // Filtrer les données dans le message d'erreur lui-même
          if (event.message && containsSensitiveData(event.message)) {
            event.message = `[Message filtré contenant des informations sensibles] ${
              event.message.substring(0, 20) + '...'
            }`;
          }

          // Filtrer les données sensibles dans les frames de stack
          if (event.exception && event.exception.values) {
            event.exception.values.forEach((exceptionValue) => {
              if (
                exceptionValue.stacktrace &&
                exceptionValue.stacktrace.frames
              ) {
                exceptionValue.stacktrace.frames.forEach((frame) => {
                  if (frame.vars) {
                    Object.keys(frame.vars).forEach((key) => {
                      const value = String(frame.vars[key] || '');
                      if (
                        containsSensitiveData(key) ||
                        containsSensitiveData(value)
                      ) {
                        frame.vars[key] = '[FILTERED]';
                      }
                    });
                  }
                });
              }
            });
          }

          return event;
        },
      });

      // Enregistrer des indicateurs de performance
      if (typeof window !== 'undefined') {
        try {
          Sentry.metrics.startTransaction({
            name: 'page-load',
            data: {
              route: window.location.pathname,
            },
          });

          // Mesurer les Core Web Vitals
          const reportWebVitals = ({ id, name, value }) => {
            Sentry.metrics.gauge(`web.vitals.${name.toLowerCase()}`, value, {
              unit: name === 'CLS' ? 'none' : 'millisecond',
              route: window.location.pathname,
            });
          };

          if (typeof window.performance !== 'undefined') {
            window.performance.addEventListener(
              'resourcetimingbufferfull',
              () => {
                window.performance.clearResourceTimings();
              },
            );
          }

          // Exporter la fonction pour que Next.js puisse l'utiliser
          window.reportWebVitals = reportWebVitals;
        } catch (e) {
          console.warn('Failed to initialize performance monitoring:', e);
        }
      }

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

    // Ajouter des contextes supplémentaires pour mieux comprendre l'erreur
    const context = {
      route: request.url,
      method: request.method,
      headers: {}, // Ne pas inclure tous les headers pour éviter les données sensibles
      errorCategory: categorizeError(error),
    };

    // Ajouter certains headers utiles sans informations sensibles
    const safeHeaders = [
      'user-agent',
      'referer',
      'accept-language',
      'content-type',
    ];
    safeHeaders.forEach((header) => {
      const value =
        request.headers && request.headers.get && request.headers.get(header);
      if (value) {
        context.headers[header] = value;
      }
    });

    // Ajouter des informations sur la requête
    Sentry.setContext('request', context);

    // Ajouter des informations sur l'utilisateur (anonymisées)
    if (request.auth && request.auth.userId) {
      Sentry.setUser({
        id:
          request.auth.userId.substring(0, 2) +
          '...' +
          request.auth.userId.slice(-2),
        role: request.auth.role || 'user',
      });
    }

    // Capturer l'erreur avec des informations supplémentaires
    Sentry.captureException(error, {
      tags: {
        component: 'server',
        error_category: categorizeError(error),
      },
    });
  } catch (e) {
    console.error('Error in onRequestError:', e);
  }
}

// Monitorer les transitions de route
export function onRouteChange({ route, isPrefetch }) {
  try {
    const Sentry = require('@sentry/nextjs');

    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Route changed to: ${route}`,
      level: 'info',
      data: {
        from:
          typeof window !== 'undefined' ? window.location.pathname : undefined,
        to: route,
        isPrefetch,
      },
    });

    // Commencer une nouvelle transaction pour la navigation
    if (!isPrefetch && typeof window !== 'undefined') {
      const transaction = Sentry.startTransaction({
        name: `navigation:${route}`,
        op: 'navigation',
      });

      // Terminer la transaction après le chargement de la page
      window.setTimeout(() => {
        transaction.finish();
      }, 0);
    }
  } catch (e) {
    // Silently fail
  }
}
