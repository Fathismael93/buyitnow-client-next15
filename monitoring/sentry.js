// monitoring/sentry.js
import * as Sentry from '@sentry/nextjs';

/**
 * Initialise et configure Sentry pour la surveillance des erreurs
 * Cette fonction est appelée depuis _app.js
 */
export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      environment: process.env.NODE_ENV,
      enabled: process.env.NODE_ENV === 'production',

      // Activer les métriques de performances
      // Taux d'échantillonnage des métriques
      _metricsSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Configurer les erreurs ignorées
      ignoreErrors: [
        // Erreurs réseau communes
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        'AbortError',
        'TypeError: Failed to fetch',

        // Erreurs de rendu React
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',

        // Erreurs de navigation
        'Cancel rendering route',
        'The operation was aborted',
        'Navigating to current location',

        // Erreurs de CSP
        'Content Security Policy',
        'violated directive',

        // Extensions de navigateur
        'chrome-extension',
        'safari-extension',
      ],

      // Ne pas suivre les erreurs pour certaines URL
      denyUrls: [
        // Ressources externes
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
        /^safari-extension:\/\//i,

        // Ressources tierces
        /googletagmanager\.com/i,
        /analytics\.google\.com/i,
      ],

      // Configurer le traitement des breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filtrer certains types d'événements de breadcrumb
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
          // Masquer les URLs sensibles
          if (
            breadcrumb.data?.url?.includes('/auth') ||
            breadcrumb.data?.url?.includes('/login') ||
            breadcrumb.data?.url?.includes('/cart')
          ) {
            breadcrumb.data.url = '[Filtered URL]';
          }
        }
        return breadcrumb;
      },

      // Configurer le traitement des événements avant l'envoi
      beforeSend(event) {
        // Ne pas envoyer d'événements pour les pages d'authentification
        if (
          event.request?.url?.includes('/auth') ||
          event.request?.url?.includes('/login') ||
          event.request?.url?.includes('/register')
        ) {
          return null;
        }

        // Anonymiser les informations utilisateur
        if (event.user) {
          if (event.user.email) event.user.email = '[Filtered]';
          if (event.user.ip_address) event.user.ip_address = '[Filtered]';
        }

        // Anonymiser les données sensibles dans les URL
        if (event.request?.url) {
          const url = new URL(event.request.url);
          if (url.searchParams.has('token')) {
            url.searchParams.set('token', '[Filtered]');
            event.request.url = url.toString();
          }
        }

        return event;
      },
    });
  }
};

/**
 * Capture une exception avec des informations contextuelles supplémentaires
 * @param {Error} error - L'erreur à capturer
 * @param {Object} context - Contexte supplémentaire sur l'erreur
 */
export const captureException = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Ajouter des tags pour faciliter le filtrage dans Sentry
    Object.entries(context.tags || {}).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    // Ajouter des données supplémentaires
    Object.entries(context.extra || {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Définir le niveau de l'erreur
    if (context.level) {
      scope.setLevel(context.level);
    }

    // Capturer l'exception
    Sentry.captureException(error);
  });
};

/**
 * Capture un message avec des informations contextuelles supplémentaires
 * @param {string} message - Le message à capturer
 * @param {Object} context - Contexte supplémentaire sur le message
 */
export const captureMessage = (message, context = {}) => {
  Sentry.withScope((scope) => {
    // Ajouter des tags pour faciliter le filtrage dans Sentry
    Object.entries(context.tags || {}).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    // Ajouter des données supplémentaires
    Object.entries(context.extra || {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Définir le niveau du message
    if (context.level) {
      scope.setLevel(context.level);
    }

    // Capturer le message
    Sentry.captureMessage(message);
  });
};

/**
 * Enregistre l'utilisateur actuel dans Sentry pour le suivi des erreurs
 * @param {Object} user - Informations de l'utilisateur à enregistrer
 */
export const setUser = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  // Ne jamais envoyer d'informations sensibles à Sentry
  Sentry.setUser({
    id: user.id || user._id,
    // Anonymiser l'email en ne conservant que son hachage
    email: user.email ? `${hashCode(user.email)}@anonymized.user` : undefined,
    role: user.role || 'user',
  });
};

/**
 * Fonction auxiliaire pour créer un hachage simple d'une chaîne
 * @param {string} str - La chaîne à hacher
 * @returns {string} - Le hachage en hexadécimal
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Conversion en 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Configuration pour les métriques de performance
const METRICS_CONFIG = {
  // Taux d'échantillonnage pour les métriques (valeur par défaut si non spécifiée dans Sentry.init)
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Seuils pour considérer une métrique comme lente (en ms)
  thresholds: {
    // Temps de rendu
    render: 100,
    // Temps de chargement de page
    pageLoad: 1000,
    // Temps de chargement de ressource
    resourceLoad: 500,
    // Temps de requête API
    apiRequest: 300,
    // Temps de traitement
    processing: 200,
  },
  // Liste des métriques à ne pas envoyer (pour limiter le volume)
  excludeMetrics: [
    // Exclure les métriques de ressources très fréquentes
    /^resource\.font\./,
    /^resource\.img\./,
    // Exclure certaines métriques de debug
    /^debug\./,
  ],
};

/**
 * Vérifie si une métrique doit être échantillonnée
 * @private
 * @returns {boolean} True si la métrique doit être enregistrée
 */
function shouldSampleMetric() {
  // Récupérer le taux d'échantillonnage de Sentry ou utiliser la valeur par défaut
  const sampleRate = Sentry._metricsSampleRate || METRICS_CONFIG.sampleRate;
  return Math.random() < sampleRate;
}

/**
 * Vérifie si une métrique doit être exclue
 * @private
 * @param {string} name - Nom de la métrique
 * @returns {boolean} True si la métrique doit être exclue
 */
function shouldExcludeMetric(name) {
  return METRICS_CONFIG.excludeMetrics.some((pattern) => pattern.test(name));
}

/**
 * Enregistre une métrique de performance
 * @param {string} name - Nom de la métrique
 * @param {number} value - Valeur de la métrique (en millisecondes)
 * @param {Object} context - Contexte supplémentaire (tags, etc.)
 */
export const recordMetric = (name, value, context = {}) => {
  // Vérifier que Sentry est initialisé
  if (!Sentry || typeof Sentry.captureMessage !== 'function') {
    return;
  }

  // Validation de base
  if (typeof name !== 'string' || !name) return;
  if (typeof value !== 'number' || isNaN(value)) return;

  // Appliquer l'échantillonnage et l'exclusion
  if (!shouldSampleMetric() || shouldExcludeMetric(name)) {
    return;
  }

  try {
    // Déterminer si la métrique est lente (pour ajouter un tag)
    let isSlowMetric = false;
    let thresholdCategory = 'other';

    // Vérifier les seuils connus
    for (const [category, threshold] of Object.entries(
      METRICS_CONFIG.thresholds,
    )) {
      if (name.includes(category) && value > threshold) {
        isSlowMetric = true;
        thresholdCategory = category;
        break;
      }
    }

    // Préparer les tags de métrique
    const metricTags = {
      metric_name: name,
      metric_value: Math.round(value),
      metric_unit: 'ms',
      is_slow: isSlowMetric,
      threshold_category: thresholdCategory,
      ...context.tags,
    };

    // Sentry.metrics est disponible dans les versions récentes
    // Si disponible, l'utiliser directement
    if (
      typeof Sentry.metrics === 'object' &&
      typeof Sentry.metrics.distribution === 'function'
    ) {
      Sentry.metrics.distribution(name, value, {
        unit: 'millisecond',
        tags: metricTags,
      });
    }
    // Sinon, utiliser captureMessage comme fallback pour les métriques lentes uniquement
    else if (isSlowMetric) {
      // Ne capturer que les métriques lentes pour éviter de surcharger Sentry
      Sentry.withScope((scope) => {
        // Ajouter tous les tags
        Object.entries(metricTags).forEach(([key, val]) => {
          scope.setTag(key, val);
        });

        // Ajouter le contexte supplémentaire
        if (context.extra) {
          Object.entries(context.extra).forEach(([key, val]) => {
            scope.setExtra(key, val);
          });
        }

        // Utiliser un niveau différent selon que la métrique est lente ou non
        scope.setLevel(
          isSlowMetric ? Sentry.Severity.Warning : Sentry.Severity.Info,
        );

        // Capturer comme message formaté
        Sentry.captureMessage(`Performance: ${name} = ${value}ms`, 'info');
      });
    }

    // Log en dev pour faciliter le debugging
    if (process.env.NODE_ENV !== 'production') {
      const color = isSlowMetric ? '\x1b[31m%s\x1b[0m' : '\x1b[33m%s\x1b[0m'; // Rouge ou jaune
      console.log(
        color,
        `[Metric] ${name}:`,
        `${value.toFixed(2)}ms`,
        isSlowMetric ? '(slow)' : '',
      );
    }
  } catch (error) {
    // Ne pas laisser une erreur de métrique perturber l'application
    console.error('Error recording metric:', error);
  }
};

/**
 * Démarre un timer pour mesurer une opération
 * @param {string} name - Nom de l'opération à mesurer
 * @returns {Function} - Fonction à appeler pour terminer la mesure et enregistrer la métrique
 */
export const startTimer = (name) => {
  const startTime = performance.now();

  return (extraTags = {}) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    recordMetric(name, duration, { tags: extraTags });
    return duration;
  };
};

/**
 * Mesure le temps d'exécution d'une fonction
 * @param {Function} fn - Fonction à mesurer
 * @param {string} name - Nom de la métrique (défaut: nom de la fonction)
 * @returns {Function} - Fonction instrumentée qui enregistre des métriques
 */
export const measureFunction = (fn, name) => {
  if (typeof fn !== 'function') {
    throw new Error('measureFunction: Premier argument doit être une fonction');
  }

  const metricName = name || fn.name || 'anonymous_function';

  return function (...args) {
    const start = performance.now();

    try {
      const result = fn.apply(this, args);

      // Si le résultat est une promesse
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = performance.now() - start;
            recordMetric(metricName, duration);
            return value;
          })
          .catch((error) => {
            const duration = performance.now() - start;
            recordMetric(`${metricName}.error`, duration, {
              tags: { error_type: error.name || 'unknown' },
            });
            throw error;
          });
      }

      // Fonction synchrone
      const duration = performance.now() - start;
      recordMetric(metricName, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      recordMetric(`${metricName}.error`, duration, {
        tags: { error_type: error.name || 'unknown' },
      });
      throw error;
    }
  };
};

/**
 * Mesure les performances Web Vitals et les envoie à Sentry
 * @param {Object} vitals - Données WebVitals fournies par la fonction reportWebVitals de Next.js
 */
export const reportWebVitals = (vitals) => {
  const { id, name, value, label } = vitals;

  // Déterminer l'unité et le seuil en fonction du type de métrique
  let unit = 'millisecond';
  let isBadScore = false;

  // Vérifier les seuils selon les recommandations de Google
  switch (name) {
    case 'FCP': // First Contentful Paint
      isBadScore = value > 1800; // > 1.8s est considéré comme lent
      break;
    case 'LCP': // Largest Contentful Paint
      isBadScore = value > 2500; // > 2.5s est considéré comme lent
      break;
    case 'CLS': // Cumulative Layout Shift
      unit = 'none';
      isBadScore = value > 0.1; // > 0.1 est considéré comme mauvais
      break;
    case 'FID': // First Input Delay
    case 'INP': // Interaction to Next Paint
      isBadScore = value > 100; // > 100ms est considéré comme lent
      break;
    case 'TTFB': // Time to First Byte
      isBadScore = value > 500; // > 500ms est considéré comme lent
      break;
  }

  // N'envoyer que les mauvais scores en production pour économiser sur le volume
  if (process.env.NODE_ENV === 'production' && !isBadScore && name !== 'LCP') {
    return; // Ignorer les bonnes performances en production, sauf LCP qui est critique
  }

  // Enregistrer la métrique
  recordMetric(`web_vitals.${name.toLowerCase()}`, value, {
    tags: {
      vital_id: id,
      vital_name: name,
      vital_label: label,
      is_bad_score: isBadScore,
    },
  });
};

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  recordMetric,
  startTimer,
  measureFunction,
  reportWebVitals,
};
