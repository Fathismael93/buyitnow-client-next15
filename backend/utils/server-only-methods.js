import 'server-only';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import queryString from 'query-string';
import { getCookieName } from '@/helpers/helpers';
import { captureException } from '@/monitoring/sentry';
import { getCacheHeaders } from '@/utils/cache';

// Cache TTL en secondes
const CACHE_TTL = {
  products: 300, // 5 minutes
  product: 600, // 10 minutes
  addresses: 900, // 15 minutes
  orders: 300, // 5 minutes
};

/**
 * Récupère les en-têtes d'authentification pour les requêtes server-to-server
 * @returns {Object} - En-têtes HTTP avec cookie d'authentification
 */
async function getAuthHeaders() {
  const nextCookies = await cookies();
  const cookieName = getCookieName();
  const authCookie = nextCookies.get(cookieName);

  if (!authCookie) {
    return {};
  }

  return {
    Cookie: `${authCookie.name}=${authCookie.value}`,
  };
}

/**
 * Récupère tous les produits avec paramètres de filtrage et pagination
 * @param {Object} searchParams - Paramètres de recherche et filtrage
 * @returns {Promise<Object>} - Données des produits, catégories et pagination
 */
export const getAllProducts = async (searchParams) => {
  try {
    console.log('Starting getAllProducts with params:', searchParams);

    // Créer un objet pour stocker les paramètres filtrés
    const urlParams = {};

    // Vérifier si searchParams est défini avant d'y accéder
    if (searchParams) {
      // Ajouter les paramètres qui existent
      if (searchParams.keyword) urlParams.keyword = searchParams.keyword;
      if (searchParams.page) urlParams.page = searchParams.page;
      if (searchParams.category) urlParams.category = searchParams.category;
      if (searchParams.min) urlParams['price[gte]'] = searchParams.min;
      if (searchParams.max) urlParams['price[lte]'] = searchParams.max;
      if (searchParams.ratings)
        urlParams['ratings[gte]'] = searchParams.ratings;
    }

    // Construire la chaîne de requête
    const searchQuery = new URLSearchParams(urlParams).toString();
    const cacheControl = getCacheHeaders('products');

    // S'assurer que l'URL est correctement formatée
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/products${searchQuery ? `?${searchQuery}` : ''}`;

    console.log('Fetching from URL:', apiUrl);

    const res = await fetch(apiUrl, {
      next: {
        revalidate: CACHE_TTL.products,
        tags: [
          'products',
          ...(urlParams.category ? [`category-${urlParams.category}`] : []),
        ],
      },
      headers: {
        'Cache-Control': cacheControl,
      },
    });

    console.log('API response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error in getAllProducts API call:', res.status, errorText);
      // Renvoyer un objet vide pour éviter de planter l'application
      return { products: [], categories: [], totalPages: 0 };
    }

    try {
      const data = await res.json();
      console.log(
        'Successfully parsed products data, count:',
        data?.products?.length || 0,
      );
      return data;
    } catch (parseError) {
      console.error('JSON parsing error in getAllProducts:', parseError);
      const rawText = await res.clone().text();
      console.error('Raw response text:', rawText.substring(0, 200) + '...'); // Log des premiers 200 caractères
      return { products: [], categories: [], totalPages: 0 };
    }
  } catch (error) {
    console.error('Exception in getAllProducts:', error);
    captureException(error, {
      tags: { action: 'get_all_products' },
      extra: { searchParams },
    });

    // Renvoyer un objet vide pour éviter de planter l'application
    return { products: [], categories: [], totalPages: 0 };
  }
};

/**
 * Récupère les détails d'un produit spécifique
 * @param {string} id - Identifiant du produit
 * @returns {Promise<Object>} - Données du produit et produits similaires
 */
export const getProductDetails = async (id) => {
  try {
    const isValidId = mongoose.isValidObjectId(id);

    if (id === undefined || id === null || !isValidId) {
      return notFound();
    }

    const cacheControl = getCacheHeaders('product');

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`,
      {
        next: {
          revalidate: CACHE_TTL.product,
          tags: [`product-${id}`],
        },
        headers: {
          'Cache-Control': cacheControl,
        },
      },
    );

    if (!res.ok) {
      return notFound();
    }

    const data = await res.json();

    if (!data || !data.product) {
      return notFound();
    }

    return data;
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_product_details' },
      extra: { productId: id },
    });
    return notFound();
  }
};

/**
 * Récupère toutes les adresses de l'utilisateur connecté
 * @param {string} page - Page appelant cette méthode
 * @returns {Promise<Object>} - Données des adresses et options de paiement
 */
export const getAllAddresses = async (page) => {
  try {
    const authHeaders = await getAuthHeaders();

    if (!Object.keys(authHeaders).length) {
      return { addresses: [] };
    }

    const cacheControl = getCacheHeaders('userData');

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/address`, {
      headers: {
        ...authHeaders,
        'Cache-Control': cacheControl,
      },
      next: {
        revalidate: 0, // Ne pas mettre en cache les données utilisateur
        tags: ['user-addresses'],
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Erreur lors de la récupération des adresses:', errorData);
      return { addresses: [] };
    }

    const data = await res.json();

    if (page === 'profile') {
      delete data?.paymentTypes;
    }

    return data;
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_all_addresses' },
      extra: { page },
    });
    return { addresses: [] };
  }
};

/**
 * Récupère une adresse spécifique
 * @param {string} id - Identifiant de l'adresse
 * @returns {Promise<Object>} - Données de l'adresse
 */
export const getSingleAddress = async (id) => {
  if (id === undefined || id === null) {
    return notFound();
  }

  try {
    const authHeaders = await getAuthHeaders();

    if (!Object.keys(authHeaders).length) {
      return notFound();
    }

    const cacheControl = getCacheHeaders('userData');

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
      {
        headers: {
          ...authHeaders,
          'Cache-Control': cacheControl,
        },
        next: {
          revalidate: 0, // Ne pas mettre en cache les données utilisateur
          tags: [`address-${id}`],
        },
      },
    );

    if (!res.ok) {
      return notFound();
    }

    const data = await res.json();

    if (!data || !data.address) {
      return notFound();
    }

    return data?.address;
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_single_address' },
      extra: { addressId: id },
    });
    return notFound();
  }
};

/**
 * Récupère toutes les commandes de l'utilisateur connecté
 * @param {Object} searchParams - Paramètres de pagination
 * @returns {Promise<Object>} - Données des commandes et pagination
 */
export const getAllOrders = async (searchParams) => {
  try {
    const authHeaders = await getAuthHeaders();

    if (!Object.keys(authHeaders).length) {
      return { orders: [], totalPages: 0 };
    }

    const urlParams = {
      page: (await searchParams)?.page || 1,
    };

    const searchQuery = queryString.stringify(urlParams);
    const cacheControl = getCacheHeaders('userData');

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/me?${searchQuery}`,
      {
        headers: {
          ...authHeaders,
          'Cache-Control': cacheControl,
        },
        next: {
          revalidate: 0, // Ne pas mettre en cache les données utilisateur
          tags: ['user-orders'],
        },
      },
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Erreur lors de la récupération des commandes:', errorData);
      return { orders: [], totalPages: 0 };
    }

    const data = await res.json();
    return data;
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_all_orders' },
      extra: { searchParams },
    });
    return { orders: [], totalPages: 0 };
  }
};

/**
 * Effectue une requête API avec gestion des erreurs et des timeouts
 * @param {string} url - URL de la requête
 * @param {Object} options - Options de la requête fetch
 * @returns {Promise<Object>} - Données de la réponse
 */
export const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || 10000,
    );

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Erreur ${response.status}: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps');
    }

    captureException(error, {
      tags: { action: 'fetch_with_error_handling' },
      extra: { url, options },
    });

    throw error;
  }
};
