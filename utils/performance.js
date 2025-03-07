/**
 * Utilitaires pour améliorer les performances de l'application
 */

/**
 * Memoize une fonction avec une durée de vie limitée pour le cache
 * @param {Function} fn - La fonction à mettre en cache
 * @param {number} ttl - Durée de vie du cache en millisecondes
 * @returns {Function} - La fonction mise en cache
 */
export function memoizeWithTTL(fn, ttl = 60000) {
  const cache = new Map();
  const timestamps = new Map();

  return function (...args) {
    const key = JSON.stringify(args);
    const now = Date.now();

    // Si la valeur existe dans le cache et n'a pas expiré
    if (cache.has(key) && now - timestamps.get(key) < ttl) {
      return cache.get(key);
    }

    // Calculer le résultat
    const result = fn.apply(this, args);

    // Si le résultat est une promesse
    if (result instanceof Promise) {
      return result.then((value) => {
        cache.set(key, value);
        timestamps.set(key, now);
        return value;
      });
    }

    // Si le résultat est une valeur standard
    cache.set(key, result);
    timestamps.set(key, now);
    return result;
  };
}

/**
 * Debounce une fonction
 * @param {Function} fn - La fonction à debouncer
 * @param {number} delay - Le délai en millisecondes
 * @returns {Function} - La fonction debouncée
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle une fonction
 * @param {Function} fn - La fonction à throttler
 * @param {number} limit - La limite en millisecondes
 * @returns {Function} - La fonction throttlée
 */
export function throttle(fn, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Charge une image à l'avance
 * @param {string} src - L'URL de l'image à charger
 * @returns {Promise} - Une promesse qui se résout lorsque l'image est chargée
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Charge plusieurs images à l'avance
 * @param {Array<string>} srcs - Les URLs des images à charger
 * @returns {Promise} - Une promesse qui se résout lorsque toutes les images sont chargées
 */
export function preloadImages(srcs) {
  return Promise.all(srcs.map((src) => preloadImage(src)));
}

/**
 * Détecte si le navigateur est en mode préférence de réduction du mouvement
 * @returns {boolean} - true si le navigateur est en mode préférence de réduction du mouvement
 */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Détecte si le navigateur est en mode data saver
 * @returns {boolean} - true si le navigateur est en mode data saver
 */
export function prefersDataSaver() {
  return (
    typeof window !== 'undefined' &&
    window.navigator.connection &&
    window.navigator.connection.saveData === true
  );
}

/**
 * Détecte si l'utilisateur est sur une connexion lente
 * @returns {boolean} - true si l'utilisateur est sur une connexion lente
 */
export function isSlowConnection() {
  return (
    typeof window !== 'undefined' &&
    window.navigator.connection &&
    (window.navigator.connection.effectiveType === 'slow-2g' ||
      window.navigator.connection.effectiveType === '2g' ||
      window.navigator.connection.downlink < 0.5)
  );
}

/**
 * Enregistre une mesure de performance
 * @param {string} name - Le nom de la mesure
 * @param {number} value - La valeur de la mesure
 */
export function recordPerformanceMetric(name, value) {
  if (
    typeof window !== 'undefined' &&
    window.performance &&
    window.performance.mark
  ) {
    window.performance.mark(name);

    if (typeof value === 'number') {
      // Utiliser l'API PerformanceObserver si disponible
      if (window.PerformanceObserver) {
        try {
          // eslint-disable-next-line no-unused-vars
          const measure = {
            detail: { value },
            entryType: 'measure',
            name,
            startTime: performance.now(),
            duration: value,
          };

          // Envoyer à Sentry ou autre service d'analytics
          if (process.env.NODE_ENV === 'production') {
            // Code pour envoyer à un service d'analytics
            console.log('Performance metric:', name, value);
          }
        } catch (e) {
          console.error('Error recording performance metric', e);
        }
      }
    }
  }
}
