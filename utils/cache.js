/**
 * Configuration et utilitaires pour la gestion du cache
 */

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

/**
 * Classe utilitaire pour gérer un cache en mémoire
 */
export class MemoryCache {
  constructor(ttl = 60 * 1000) {
    // Durée de vie par défaut: 1 minute
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Obtenir une valeur du cache
   * @param {string} key - Clé de cache
   * @returns {any|null} - Valeur en cache ou null si absente/expirée
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const { value, expiry } = this.cache.get(key);

    // Vérifier si la valeur a expiré
    if (expiry < Date.now()) {
      this.delete(key);
      return null;
    }

    return value;
  }

  /**
   * Mettre une valeur en cache
   * @param {string} key - Clé de cache
   * @param {any} value - Valeur à mettre en cache
   * @param {number} [customTtl] - Durée de vie personnalisée en ms
   */
  set(key, value, customTtl) {
    const ttl = customTtl || this.ttl;
    const expiry = Date.now() + ttl;

    this.cache.set(key, { value, expiry });

    // Planifier le nettoyage automatique
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  /**
   * Supprimer une valeur du cache
   * @param {string} key - Clé de cache
   * @returns {boolean} - True si la valeur existait
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Vider tout le cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtenir la taille du cache
   * @returns {number} - Nombre d'entrées dans le cache
   */
  size() {
    return this.cache.size;
  }
}

// Instance de cache pour l'application
export const appCache = {
  products: new MemoryCache(CACHE_CONFIGS.products.maxAge * 1000),
  categories: new MemoryCache(CACHE_CONFIGS.categories.maxAge * 1000),
};

/**
 * Fonction utilitaire pour obtenir une clé de cache canonique
 * @param {string} prefix - Préfixe de la clé
 * @param {Object} params - Paramètres pour générer la clé
 * @returns {string} - Clé de cache unique
 */
export function getCacheKey(prefix, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${prefix}:${sortedParams || 'default'}`;
}
