/* eslint-disable no-unused-vars */
/**
 * Utilitaires pour l'application e-commerce
 */

/**
 * Met à jour un paramètre de requête
 * @param {URLSearchParams} queryParams - Paramètres de requête
 * @param {string} key - Clé du paramètre
 * @param {string} value - Valeur du paramètre
 * @returns {URLSearchParams} - Paramètres mis à jour
 */
export const getPriceQueryParams = (queryParams, key, value) => {
  // Créer une copie pour éviter de modifier l'original
  const params = new URLSearchParams(queryParams.toString());

  const hasValueInParam = params.has(key);

  if (value && hasValueInParam) {
    params.set(key, value);
  } else if (value) {
    params.append(key, value);
  } else if (hasValueInParam) {
    params.delete(key);
  }

  return params;
};

/**
 * Parse une URL de callback
 * @param {string} url - URL à parser
 * @returns {string} - URL parsée
 */
export const parseCallbackUrl = (url) => {
  if (!url) return '/';

  try {
    // Vérifier si l'URL est déjà décodée
    if (!url.includes('%')) {
      return url;
    }

    // Décoder les caractères spéciaux dans l'URL
    const decodedUrl = decodeURIComponent(url);

    // Vérifier si l'URL est externe
    const urlObj = new URL(decodedUrl, window.location.origin);

    // Ne retourner que les URL internes
    if (urlObj.origin === window.location.origin) {
      return decodedUrl;
    }

    return '/';
  } catch (error) {
    // En cas d'erreur, retourner l'URL décodée de base
    return url.replace(/%3A/g, ':').replace(/%2F/g, '/');
  }
};

/**
 * Obtenir le nom du cookie d'authentification selon l'environnement
 * @returns {string} - Nom du cookie
 */
export const getCookieName = () => {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
};

/**
 * Chargeur d'image Cloudinary pour Next.js Image
 * @param {Object} params - Paramètres de l'image
 * @returns {string} - URL de l'image
 */
export function cloudinaryLoader({ src, width, quality }) {
  // Vérifier si l'URL est déjà une URL Cloudinary
  const isCloudinaryUrl = src.includes('res.cloudinary.com');

  if (!isCloudinaryUrl) {
    return src;
  }

  // Paramètres par défaut si non fournis
  const params = [
    `w_${width || 'auto'}`,
    `q_${quality || 'auto'}`,
    'f_auto', // Format automatique
    'c_limit', // Limiter la taille mais maintenir le ratio
  ];

  // Construire l'URL complète
  const paramsString = params.join(',');

  // Trouver l'index de "upload/" pour insérer les paramètres après
  const uploadIndex = src.indexOf('upload/');

  if (uploadIndex !== -1) {
    return (
      src.slice(0, uploadIndex + 7) +
      paramsString +
      '/' +
      src.slice(uploadIndex + 7)
    );
  }

  return src;
}

/**
 * Vérifier si un tableau est vide ou non défini
 * @param {Array} array - Tableau à vérifier
 * @returns {boolean} - True si le tableau est vide ou non défini
 */
export const arrayHasData = (array) => {
  return array === undefined || !Array.isArray(array) || array?.length === 0;
};

/**
 * Formater un prix
 * @param {number} price - Prix à formater
 * @param {string} [currency='EUR'] - Devise
 * @returns {string} - Prix formaté
 */
export const formatPrice = (price, currency = 'EUR') => {
  if (price === undefined || price === null) return '0,00 €';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

/**
 * Formater une date
 * @param {string|Date} date - Date à formater
 * @param {Object} options - Options de formatage
 * @returns {string} - Date formatée
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      ...defaultOptions,
      ...options,
    });
  } catch (error) {
    return date.toString();
  }
};

/**
 * Tronquer un texte à une longueur donnée
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} - Texte tronqué
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';

  if (text.length <= maxLength) return text;

  // Couper au dernier espace avant maxLength pour éviter de couper un mot
  const lastSpace = text.slice(0, maxLength).lastIndexOf(' ');
  const truncated = text.slice(0, lastSpace > 0 ? lastSpace : maxLength);

  return `${truncated}...`;
};

/**
 * Vérifier si une URL est valide
 * @param {string} url - URL à vérifier
 * @returns {boolean} - True si l'URL est valide
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Débouncer une fonction
 * @param {Function} func - Fonction à débouncer
 * @param {number} delay - Délai en millisecondes
 * @returns {Function} - Fonction debouncée
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;

  return function (...args) {
    const context = this;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
};

/**
 * Générer un ID unique
 * @returns {string} - ID unique
 */
export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Vérifier si l'application est en mode développement
 * @returns {boolean} - True si en mode développement
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Extraire l'extension d'un nom de fichier
 * @param {string} filename - Nom du fichier
 * @returns {string} - Extension du fichier
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';

  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * Calculer la taille d'un fichier en format lisible
 * @param {number} bytes - Taille en octets
 * @returns {string} - Taille formatée
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
