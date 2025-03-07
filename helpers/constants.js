/**
 * Constants pour l'application e-commerce
 * Centralisation des constantes pour éviter les erreurs de typo
 */

// Actions pour le panier
export const INCREASE = 'INCREASE';
export const DECREASE = 'DECREASE';

// Statuts des commandes
export const ORDER_STATUS = {
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Statuts des paiements
export const PAYMENT_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  REFUNDED: 'refunded',
};

// Rôles utilisateur
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Types de médias autorisés
export const ALLOWED_MEDIA_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Limites
export const LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PRODUCTS_PER_PAGE: 20,
  MAX_CART_ITEMS: 20,
  MIN_PASSWORD_LENGTH: 6,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
};

// Durées (en millisecondes)
export const DURATIONS = {
  TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 jours
  RESET_PASSWORD_EXPIRY: 60 * 60 * 1000, // 1 heure
  TOAST_DURATION: 5000, // 5 secondes
  DEBOUNCE_DELAY: 300, // 300ms
};

// Messages
export const MESSAGES = {
  CART: {
    ADDED: 'Produit ajouté au panier',
    UPDATED: 'Panier mis à jour',
    REMOVED: 'Produit retiré du panier',
    MAX_QUANTITY: 'Quantité maximale atteinte',
    MIN_QUANTITY: 'Il reste une seule unité',
  },
  AUTH: {
    LOGIN_SUCCESS: 'Connexion réussie',
    LOGOUT_SUCCESS: 'Déconnexion réussie',
    REGISTER_SUCCESS: 'Inscription réussie',
    PASSWORD_UPDATED: 'Mot de passe mis à jour',
    PROFILE_UPDATED: 'Profil mis à jour',
  },
  ORDER: {
    CREATED: 'Commande créée avec succès',
    UPDATED: 'Commande mise à jour',
    CANCELLED: 'Commande annulée',
    PAYMENT_SUCCESS: 'Paiement réussi',
  },
  ERROR: {
    GENERAL: 'Une erreur est survenue',
    AUTH: "Erreur d'authentification",
    PAYMENT: 'Erreur de paiement',
    SERVER: 'Erreur serveur',
    NETWORK: 'Problème de connexion réseau',
  },
};

// Paramètres de pagination par défaut
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
};

// Catégories (pour le développement et les tests)
export const CATEGORIES = [
  'Électronique',
  'Vêtements',
  'Maison',
  'Sports',
  'Livres',
  'Beauté',
];

// Routes d'API
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    UPDATE_PROFILE: '/api/auth/me/update',
    UPDATE_PASSWORD: '/api/auth/me/update_password',
  },
  PRODUCTS: {
    LIST: '/api/products',
    DETAIL: (id) => `/api/products/${id}`,
    SEARCH: '/api/products/search',
    CATEGORY: (id) => `/api/products/category/${id}`,
  },
  CART: {
    GET: '/api/cart',
    ADD: '/api/cart',
    UPDATE: '/api/cart',
    REMOVE: (id) => `/api/cart/${id}`,
  },
  ORDERS: {
    LIST: '/api/orders/me',
    DETAIL: (id) => `/api/orders/${id}`,
    CREATE: '/api/orders/webhook',
  },
  ADDRESS: {
    LIST: '/api/address',
    DETAIL: (id) => `/api/address/${id}`,
    CREATE: '/api/address',
    UPDATE: (id) => `/api/address/${id}`,
    DELETE: (id) => `/api/address/${id}`,
  },
};
