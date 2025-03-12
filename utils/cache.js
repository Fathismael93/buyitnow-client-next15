/**
 * Configuration et utilitaires pour la gestion du cache
 */

import { captureException } from '@/monitoring/sentry';
import { memoizeWithTTL, isSlowConnection } from '@/utils/performance';

// Configuration du cache pour les différentes ressources
export const CACHE_CONFIGS = {
  // Durée de cache pour les produits (10 minutes)
  products: {
    maxAge: 10 * 60,
    staleWhileRevalidate: 60,
  },
  // Durée de cache pour les catégories (1 heure)
  categories: {
    maxAge: 60 * 60,
    staleWhileRevalidate: 5 * 60,
  },
  // Durée de cache pour les pages statiques (1 jour)
  staticPages: {
    maxAge: 24 * 60 * 60,
    staleWhileRevalidate: 60 * 60,
  },
  // Durée de cache pour les ressources statiques (1 semaine)
  staticAssets: {
    maxAge: 7 * 24 * 60 * 60,
    immutable: true,
  },
  // Pas de cache pour les données utilisateur
  userData: {
    noStore: true,
  },
};

/**
 * Génère les entêtes de cache pour Next.js
 * @param {string} resourceType - Type de ressource ('products', 'categories', etc.)
 * @returns {Object} - Les entêtes de cache pour Next.js
 */
export function getCacheHeaders(resourceType) {
  const config = CACHE_CONFIGS[resourceType] || CACHE_CONFIGS.staticPages;

  if (config.noStore) {
    return {
      'Cache-Control': 'no-store',
    };
  }

  let cacheControl = `max-age=${config.maxAge}`;

  if (config.staleWhileRevalidate) {
    cacheControl += `, stale-while-revalidate=${config.staleWhileRevalidate}`;
  }

  if (config.immutable) {
    cacheControl += ', immutable';
  }

  return {
    'Cache-Control': cacheControl,
  };
}

// Implémentation minimaliste d'un EventEmitter compatible avec le navigateur et Node.js
export const cacheEvents = (() => {
  const listeners = {};

  return {
    on(event, callback) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
      return this;
    },

    emit(event, data) {
      if (listeners[event]) {
        listeners[event].forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Event error: ${error.message}`);
          }
        });
      }
      return this;
    },

    off(event, callback) {
      if (!listeners[event]) return this;

      if (callback) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      } else {
        delete listeners[event];
      }

      return this;
    },

    once(event, callback) {
      const onceCallback = (data) => {
        this.off(event, onceCallback);
        callback(data);
      };

      return this.on(event, onceCallback);
    },
  };
})();

/**
 * Serialize une valeur pour le stockage
 * @param {any} value - Valeur à sérialiser
 * @param {boolean} compress - Si true, compresse les grandes valeurs
 * @returns {Object} Objet avec la valeur et métadonnées
 * @throws {Error} Si la valeur ne peut pas être sérialisée/compressée
 */
function serializeValue(value, compress = false) {
  try {
    const serialized = JSON.stringify(value);
    const size = serialized.length;

    // Compression pour les grandes valeurs
    if (compress && size > 100000) {
      // 100KB
      // Compression simple, à remplacer par une vraie compression en production
      const compressed = `${serialized.substring(0, 100)}...${serialized.substring(serialized.length - 100)}`;
      return {
        value: compressed,
        originalSize: size,
        compressed: true,
      };
    }

    return { value: serialized, size, compressed: false };
  } catch (error) {
    throw new Error(`Failed to serialize cache value: ${error.message}`);
  }
}

/**
 * Désérialise une valeur du cache
 * @param {Object} storedData - Données stockées
 * @returns {any} Valeur désérialisée
 * @throws {Error} Si la valeur ne peut pas être désérialisée
 */
function deserializeValue(storedData) {
  try {
    if (!storedData) return null;
    return JSON.parse(storedData.value);
  } catch (error) {
    throw new Error(`Failed to deserialize cache value: ${error.message}`);
  }
}

/**
 * Fonction utilitaire pour journaliser les erreurs de cache
 * @param {Object} instance - Instance de cache
 * @param {string} operation - Opération qui a échoué
 * @param {string} key - Clé concernée
 * @param {Error} error - Erreur survenue
 */
function logCacheError(instance, operation, key, error) {
  instance.log(
    `Cache error during ${operation} for key '${key}': ${error.message}`,
  );

  // Log plus détaillé pour le développement
  if (process.env.NODE_ENV !== 'production') {
    instance.log(error);
  }

  // Capturer l'exception pour Sentry en production
  if (
    process.env.NODE_ENV === 'production' &&
    typeof captureException === 'function'
  ) {
    captureException(error, {
      tags: {
        component: 'cache',
        operation,
      },
      extra: {
        key,
        cacheStats: instance.getStats?.() || {},
      },
    });
  }
}

/**
 * Classe utilitaire pour gérer un cache en mémoire avec des fonctionnalités avancées
 */
export class MemoryCache {
  /**
   * Crée une nouvelle instance du cache
   * @param {Object|number} options - Options de configuration ou TTL
   */
  constructor(options = {}) {
    const opts = typeof options === 'number' ? { ttl: options } : options;

    const {
      ttl = 60 * 1000,
      maxSize = 1000,
      maxBytes = 50 * 1024 * 1024, // 50MB
      logFunction = console.debug,
      compress = false,
      name = 'memory-cache',
    } = opts;

    this.cache = new Map();
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.maxBytes = maxBytes;
    this.currentBytes = 0;
    this.log = logFunction;
    this.compress = compress;
    this.name = name;
    this.cleanupIntervalId = null;

    // Statistiques de performance
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0,
      cleanups: 0,
    };

    // Ordre LRU pour l'éviction
    this.lruList = [];

    // Démarrer le nettoyage périodique
    this._startCleanupInterval();
  }

  /**
   * Obtenir une valeur du cache
   * @param {string} key - Clé de cache
   * @returns {any|null} - Valeur en cache ou null si absente/expirée
   */
  get(key) {
    try {
      const startTime =
        typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (!this.cache.has(key)) {
        this.stats.misses++;
        cacheEvents.emit('miss', { key, cache: this });

        return null;
      }

      const entry = this.cache.get(key);

      // Vérifier si la valeur a expiré
      if (entry.expiry < Date.now()) {
        this.delete(key);
        this.stats.misses++;
        cacheEvents.emit('expire', { key, cache: this });

        return null;
      }

      // Mettre à jour la position LRU
      this._updateLRU(key);

      this.stats.hits++;
      cacheEvents.emit('hit', { key, cache: this });

      const value = deserializeValue(entry.data);

      return value;
    } catch (error) {
      this.stats.errors++;
      logCacheError(this, 'get', key, error);
      cacheEvents.emit('error', { error, operation: 'get', key, cache: this });
      return null;
    }
  }

  /**
   * Mettre une valeur en cache
   * @param {string} key - Clé de cache
   * @param {any} value - Valeur à mettre en cache
   * @param {Object|number} options - Options ou durée de vie personnalisée
   * @returns {boolean} - True si l'opération a réussi
   */
  set(key, value, options = {}) {
    try {
      const startTime =
        typeof performance !== 'undefined' ? performance.now() : Date.now();

      // Validation de la clé
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid cache key');
      }

      // Nettoyer les options
      const opts = typeof options === 'number' ? { ttl: options } : options;

      const ttl = opts.ttl || this.ttl;
      const compress =
        opts.compress !== undefined ? opts.compress : this.compress;
      const expiry = Date.now() + ttl;

      // Sérialiser la valeur
      const serialized = serializeValue(value, compress);

      // Vérifier la taille
      if (serialized.size > this.maxBytes * 0.1) {
        // Une entrée ne doit pas dépasser 10% du cache
        this.log(`Cache entry too large: ${key} (${serialized.size} bytes)`);
        return false;
      }

      // Si le cache atteint sa taille max, faire de la place
      if (
        this.cache.size >= this.maxSize ||
        this.currentBytes + serialized.size > this.maxBytes
      ) {
        this._evict(serialized.size);
      }

      // Si la clé existe déjà, soustraire sa taille actuelle
      if (this.cache.has(key)) {
        const currentEntry = this.cache.get(key);
        this.currentBytes -= currentEntry.data.size || 0;
      }

      // Ajouter au cache
      this.cache.set(key, {
        data: serialized,
        expiry,
        lastAccessed: Date.now(),
      });

      // Mettre à jour la taille totale et la liste LRU
      this.currentBytes += serialized.size;
      this._updateLRU(key);

      this.stats.sets++;
      cacheEvents.emit('set', { key, size: serialized.size, cache: this });

      return true;
    } catch (error) {
      this.stats.errors++;
      logCacheError(this, 'set', key, error);
      cacheEvents.emit('error', { error, operation: 'set', key, cache: this });
      return false;
    }
  }

  /**
   * Supprimer une valeur du cache
   * @param {string} key - Clé de cache
   * @returns {boolean} - True si la valeur existait
   */
  delete(key) {
    try {
      if (!this.cache.has(key)) return false;

      // Récupérer l'entrée pour soustraire sa taille
      const entry = this.cache.get(key);
      if (entry?.data?.size) {
        this.currentBytes -= entry.data.size;
      }

      // Supprimer de la liste LRU
      const lruIndex = this.lruList.indexOf(key);
      if (lruIndex !== -1) {
        this.lruList.splice(lruIndex, 1);
      }

      const result = this.cache.delete(key);

      if (result) {
        this.stats.deletes++;
        cacheEvents.emit('delete', { key, cache: this });
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      logCacheError(this, 'delete', key, error);
      return false;
    }
  }

  /**
   * Vider tout le cache
   * @returns {boolean} - True si l'opération a réussi
   */
  clear() {
    try {
      this.cache.clear();
      this.lruList = [];
      this.currentBytes = 0;
      cacheEvents.emit('clear', { cache: this });
      return true;
    } catch (error) {
      logCacheError(this, 'clear', 'all', error);
      return false;
    }
  }

  /**
   * Obtenir la taille du cache
   * @returns {Object} - Statistiques de taille du cache
   */
  size() {
    return {
      entries: this.cache.size,
      bytes: this.currentBytes,
      maxEntries: this.maxSize,
      maxBytes: this.maxBytes,
      utilization: Math.round((this.currentBytes / this.maxBytes) * 100) / 100,
    };
  }

  /**
   * Obtenir des statistiques sur l'utilisation du cache
   * @returns {Object} - Statistiques d'utilisation
   */
  getStats() {
    const sizeInfo = this.size();
    const hitRatio =
      this.stats.hits + this.stats.misses > 0
        ? Math.round(
            (this.stats.hits / (this.stats.hits + this.stats.misses)) * 1000,
          ) / 10
        : 0;

    return {
      ...this.stats,
      size: sizeInfo,
      hitRatio: `${hitRatio}%`,
    };
  }

  /**
   * Supprimer toutes les entrées correspondant à un pattern
   * @param {RegExp|string} pattern - Pattern de clé à supprimer
   * @returns {number} - Nombre d'entrées supprimées
   */
  invalidatePattern(pattern) {
    try {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      const keysToDelete = [];

      // Collecter d'abord les clés pour éviter de modifier pendant l'itération
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      // Supprimer les clés collectées
      keysToDelete.forEach((key) => this.delete(key));

      cacheEvents.emit('invalidatePattern', {
        pattern: pattern.toString(),
        count: keysToDelete.length,
        cache: this,
      });

      return keysToDelete.length;
    } catch (error) {
      logCacheError(this, 'invalidatePattern', pattern.toString(), error);
      return 0;
    }
  }

  /**
   * Nettoie les entrées expirées du cache
   * @returns {number} - Nombre d'entrées nettoyées
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiry < now) {
          this.delete(key);
          cleaned++;
        }
      }

      this.stats.cleanups++;

      if (cleaned > 0) {
        cacheEvents.emit('cleanup', { count: cleaned, cache: this });
      }

      return cleaned;
    } catch (error) {
      logCacheError(this, 'cleanup', 'all', error);
      return 0;
    }
  }

  /**
   * Démarre l'intervalle de nettoyage automatique
   * @private
   */
  _startCleanupInterval() {
    if (typeof setInterval !== 'undefined' && !this.cleanupIntervalId) {
      // Nettoyer toutes les 5 minutes
      this.cleanupIntervalId = setInterval(
        () => {
          this.cleanup();
        },
        5 * 60 * 1000,
      );

      // Assurer que l'intervalle ne bloque pas le garbage collector
      if (
        this.cleanupIntervalId &&
        typeof this.cleanupIntervalId === 'object'
      ) {
        this.cleanupIntervalId.unref?.();
      }
    }
  }

  /**
   * Arrête l'intervalle de nettoyage automatique
   */
  stopCleanupInterval() {
    if (this.cleanupIntervalId && typeof clearInterval !== 'undefined') {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Met à jour la position LRU d'une clé
   * @param {string} key - Clé à mettre à jour
   * @private
   */
  _updateLRU(key) {
    // Mettre à jour le timestamp de dernier accès
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      entry.lastAccessed = Date.now();
    }

    // Mettre à jour la position dans la liste LRU
    const index = this.lruList.indexOf(key);
    if (index !== -1) {
      this.lruList.splice(index, 1);
    }
    this.lruList.push(key);
  }

  /**
   * Supprime les entrées les moins récemment utilisées pour faire de la place
   * @param {number} neededBytes - Nombre d'octets nécessaires
   * @private
   */
  _evict(neededBytes = 0) {
    let evicted = 0;
    let freedBytes = 0;

    // Commencer par les entrées expirées
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        const size = entry.data.size || 0;
        this.delete(key);
        freedBytes += size;
        evicted++;
      }

      // Si on a libéré assez d'espace, on s'arrête
      if (
        this.cache.size < this.maxSize &&
        this.currentBytes + neededBytes <= this.maxBytes
      ) {
        break;
      }
    }

    // Si on n'a pas libéré assez d'espace, on supprime les entrées LRU
    while (
      this.lruList.length > 0 &&
      (this.cache.size >= this.maxSize ||
        this.currentBytes + neededBytes > this.maxBytes)
    ) {
      const oldestKey = this.lruList.shift();
      if (this.cache.has(oldestKey)) {
        const entry = this.cache.get(oldestKey);
        const size = entry.data.size || 0;
        this.cache.delete(oldestKey);
        this.currentBytes -= size;
        freedBytes += size;
        evicted++;
        this.stats.evictions++;
      }
    }

    if (evicted > 0) {
      cacheEvents.emit('evict', {
        count: evicted,
        freedBytes,
        cache: this,
      });
    }

    return evicted;
  }

  /**
   * S'assure que les ressources sont libérées lors de la destruction
   */
  destroy() {
    this.stopCleanupInterval();
    this.clear();
  }

  /**
   * Récupère en cache si disponible, sinon exécute la fonction et met en cache
   * @param {string} key - Clé de cache
   * @param {Function} fn - Fonction à exécuter si cache manquant
   * @param {Object} options - Options de cache
   * @returns {Promise<any>} - Valeur en cache ou résultat de la fonction
   */
  async getOrSet(key, fn, options = {}) {
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    try {
      const result = await Promise.resolve(fn());
      this.set(key, result, options);
      return result;
    } catch (error) {
      logCacheError(this, 'getOrSet', key, error);
      throw error;
    }
  }
}

/**
 * Cache avec persistance dans localStorage (pour le navigateur uniquement)
 * Avec fallback vers MemoryCache en environnement serveur
 */
export class PersistentCache extends MemoryCache {
  /**
   * Crée une nouvelle instance avec persistance localStorage
   * @param {string} namespace - Espace de noms pour éviter les collisions
   * @param {Object} options - Options similaires à MemoryCache
   */
  constructor(namespace, options = {}) {
    super({
      ...options,
      name: `persistent-${namespace}`,
    });

    this.namespace = namespace;
    this.storageAvailable = this._isStorageAvailable();

    // Adapter TTL pour les connexions lentes
    if (
      typeof window !== 'undefined' &&
      typeof isSlowConnection === 'function' &&
      isSlowConnection()
    ) {
      this.ttl = Math.max(this.ttl * 2, 5 * 60 * 1000); // Au moins 5 minutes
      this.log(
        `Slow connection detected, extending cache TTL to ${this.ttl}ms`,
      );
    }

    // Charger les données persistantes au démarrage
    if (this.storageAvailable) {
      this._loadFromStorage();
    }
  }

  /**
   * Vérifie si localStorage est disponible
   * @returns {boolean} - True si disponible
   * @private
   */
  _isStorageAvailable() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const testKey = '__cache_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Génère une clé avec namespace pour localStorage
   * @param {string} key - Clé originale
   * @returns {string} - Clé avec namespace
   * @private
   */
  _getStorageKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Charge les données depuis localStorage
   * @private
   */
  _loadFromStorage() {
    if (!this.storageAvailable) return;

    try {
      const now = Date.now();
      let loadedCount = 0;

      // Chercher toutes les clés qui commencent par notre namespace
      for (let i = 0; i < window.localStorage.length; i++) {
        const storageKey = window.localStorage.key(i);

        if (storageKey && storageKey.startsWith(`${this.namespace}:`)) {
          const cacheKey = storageKey.slice(this.namespace.length + 1);
          const storedData = JSON.parse(
            window.localStorage.getItem(storageKey),
          );

          // Vérifier si l'entrée n'a pas expiré
          if (storedData && storedData.expiry > now) {
            // Utiliser la méthode interne pour éviter de persister à nouveau
            super.set(cacheKey, deserializeValue(storedData.data), {
              ttl: storedData.expiry - now,
            });
            loadedCount++;
          } else {
            // Supprimer les entrées expirées
            window.localStorage.removeItem(storageKey);
          }
        }
      }

      if (loadedCount > 0) {
        this.log(`Loaded ${loadedCount} items from persistent storage`);
      }
    } catch (error) {
      logCacheError(this, 'loadFromStorage', this.namespace, error);
    }
  }

  /**
   * @override
   */
  set(key, value, options = {}) {
    // D'abord utiliser l'implémentation parente
    const result = super.set(key, value, options);

    // Si le stockage est disponible et l'opération a réussi, persister
    if (result && this.storageAvailable) {
      try {
        const entry = this.cache.get(key);
        if (entry) {
          const storageKey = this._getStorageKey(key);
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({
              data: entry.data,
              expiry: entry.expiry,
            }),
          );
        }
      } catch (error) {
        // En cas d'erreur (ex: quota dépassé), logger mais ne pas échouer
        logCacheError(this, 'persistToStorage', key, error);
      }
    }

    return result;
  }

  /**
   * @override
   */
  delete(key) {
    const result = super.delete(key);

    if (result && this.storageAvailable) {
      try {
        const storageKey = this._getStorageKey(key);
        window.localStorage.removeItem(storageKey);
      } catch (error) {
        logCacheError(this, 'deleteFromStorage', key, error);
      }
    }

    return result;
  }

  /**
   * @override
   */
  clear() {
    const result = super.clear();

    if (result && this.storageAvailable) {
      try {
        // Supprimer uniquement les entrées de notre namespace
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(`${this.namespace}:`)) {
            window.localStorage.removeItem(key);
          }
        }
      } catch (error) {
        logCacheError(this, 'clearStorage', this.namespace, error);
      }
    }

    return result;
  }

  /**
   * Méthode utilitaire pour mettre en cache une URL chargée
   * Cette méthode est utile pour cacher les résultats de fetch API
   * @param {string} url - URL à mettre en cache
   * @param {Function} fetchFn - Fonction fetch à exécuter si cache manquant
   * @param {Object} options - Options de cache et fetch
   * @returns {Promise<any>} - Données en cache ou résultat du fetch
   */
  async cachedFetch(url, fetchFn, options = {}) {
    const {
      ttl = this.ttl,
      revalidateOnError = true,
      ...fetchOptions
    } = options;

    const cacheKey = `fetch:${url}`;
    const cachedResponse = this.get(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    const doFetch =
      fetchFn || ((url) => fetch(url, fetchOptions).then((r) => r.json()));

    try {
      const response = await doFetch(url);
      this.set(cacheKey, response, { ttl });
      return response;
    } catch (error) {
      logCacheError(this, 'cachedFetch', cacheKey, error);

      if (revalidateOnError) {
        // Invalider le cache en cas d'erreur pour forcer une réactualisation
        this.delete(cacheKey);
      }

      throw error;
    }
  }
}

/**
 * Fonction utilitaire pour obtenir une clé de cache canonique
 * @param {string} prefix - Préfixe de la clé
 * @param {Object} params - Paramètres pour générer la clé
 * @returns {string} - Clé de cache unique
 */
export function getCacheKey(prefix, params = {}) {
  // Vérifier et nettoyer les entrées pour la sécurité
  const cleanParams = {};

  for (const [key, value] of Object.entries(params)) {
    // Ignorer les valeurs nulles ou undefined
    if (value === undefined || value === null) continue;

    // Éviter les injections en supprimant les caractères spéciaux
    const cleanKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');
    let cleanValue;

    // Traiter différemment selon le type
    if (typeof value === 'object') {
      cleanValue = JSON.stringify(value);
    } else {
      cleanValue = String(value);
    }

    // Limiter la taille des valeurs pour éviter des clés trop longues
    if (cleanValue.length > 100) {
      cleanValue = cleanValue.substring(0, 97) + '...';
    }

    cleanParams[cleanKey] = encodeURIComponent(cleanValue);
  }

  // Trier les paramètres pour garantir l'unicité
  const sortedParams = Object.keys(cleanParams)
    .sort()
    .map((key) => `${key}=${cleanParams[key]}`)
    .join('&');

  // Préfixe validé
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '');

  return `${safePrefix}:${sortedParams || 'default'}`;
}

/**
 * Crée une fonction memoizée avec intégration du système de cache
 * Combine les fonctionnalités de memoizeWithTTL et MemoryCache
 * @param {Function} fn - Fonction à mettre en cache
 * @param {Object} options - Options de cache
 * @returns {Function} - Fonction mise en cache
 */
export function createCachedFunction(fn, options = {}) {
  const {
    ttl = 60 * 1000,
    maxEntries = 100,
    keyGenerator = (...args) => JSON.stringify(args),
    name = fn.name || 'anonymous',
  } = options;

  // Vérifier si memoizeWithTTL est disponible
  if (typeof memoizeWithTTL === 'function') {
    // Utiliser la fonction de performance.js si disponible
    return memoizeWithTTL(fn, ttl);
  }

  // Créer un cache dédié pour cette fonction
  const functionCache = new MemoryCache({
    ttl,
    maxSize: maxEntries,
    name: `function-${name}`,
    logFunction: (msg) => console.debug(`[CachedFn:${name}] ${msg}`),
  });

  // Créer la fonction enveloppante
  return async function (...args) {
    try {
      const cacheKey = keyGenerator(...args);

      // Vérifier le cache
      const cachedResult = functionCache.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Exécuter la fonction
      const startTime =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const result = await Promise.resolve(fn.apply(this, args));
      const duration =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
        startTime;

      // Mettre en cache
      functionCache.set(cacheKey, result);

      return result;
    } catch (error) {
      logCacheError(functionCache, 'execution', fn.name, error);
      throw error;
    }
  };
}

// Instances de cache pour l'application avec les configurations améliorées
export const appCache = {
  products: new MemoryCache({
    ttl: CACHE_CONFIGS.products.maxAge * 1000,
    maxSize: 500,
    compress: true,
    name: 'products',
    logFunction: (msg) => console.debug(`[ProductCache] ${msg}`),
  }),

  categories: new MemoryCache({
    ttl: CACHE_CONFIGS.categories.maxAge * 1000,
    maxSize: 100,
    name: 'categories',
    logFunction: (msg) => console.debug(`[CategoryCache] ${msg}`),
  }),

  // Cache côté client pour les données UI fréquemment utilisées
  ui:
    typeof window !== 'undefined'
      ? new PersistentCache('buyitnow_ui', {
          ttl: 30 * 60 * 1000, // 30 min
          maxSize: 50,
          maxBytes: 2 * 1024 * 1024, // 2MB max
        })
      : null,
};

// Enregistrer un handler pour nettoyer les caches à l'arrêt de l'application
if (typeof process !== 'undefined' && process.on) {
  process.on('SIGTERM', () => {
    Object.values(appCache).forEach((cache) => {
      if (cache && typeof cache.destroy === 'function') {
        cache.destroy();
      }
    });
  });
}
