// services/api.js
import { captureException } from '@/monitoring/sentry';
import { toast } from 'react-toastify';

// Configuration de base pour les requêtes API
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_TIMEOUT = 15000; // 15 secondes

/**
 * Utilitaire de gestion des requêtes API avec gestion des erreurs
 */
class ApiService {
  /**
   * Effectue une requête GET
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  /**
   * Effectue une requête POST
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object|string} data - Les données à envoyer
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  /**
   * Effectue une requête PUT
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object|string} data - Les données à envoyer
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  /**
   * Effectue une requête DELETE
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  /**
   * Méthode générique pour effectuer une requête HTTP
   * @param {string} method - La méthode HTTP (GET, POST, PUT, DELETE)
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object|string|null} data - Les données à envoyer
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async request(method, endpoint, data = null, options = {}) {
    const {
      headers = {},
      timeout = DEFAULT_TIMEOUT,
      showErrorToast = true,
      transformResponse = (res) => res,
      ...fetchOptions
    } = options;

    // Préparer l'URL complète
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_URL}${endpoint}`;

    // Préparer les options de la requête
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include', // Pour inclure les cookies dans les requêtes
      ...fetchOptions,
    };

    // Ajouter les données pour les requêtes POST et PUT
    if (data) {
      if (typeof data === 'string') {
        requestOptions.body = data;
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    }

    try {
      // Ajouter un timeout à la requête
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      requestOptions.signal = controller.signal;

      // Effectuer la requête
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Vérifier si la requête a été rejetée
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          errorData = { message: response.statusText };
        }

        const error = new Error(
          errorData.message || `Erreur ${response.status}`,
        );
        error.status = response.status;
        error.data = errorData;

        // Log l'erreur avec Sentry
        captureException(error, {
          tags: {
            api_endpoint: endpoint,
            status_code: response.status,
          },
          extra: {
            method,
            url,
            requestBody: data,
            responseBody: errorData,
          },
        });

        // Afficher un toast d'erreur si demandé
        if (showErrorToast) {
          const errorMessage = errorData.message || 'Une erreur est survenue';
          toast.error(errorMessage);
        }

        throw error;
      }

      // Traiter la réponse
      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Transformer la réponse si nécessaire
      return transformResponse(responseData);
    } catch (error) {
      // Gérer les erreurs de timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error(
          `La requête a dépassé le délai d'attente (${timeout}ms)`,
        );

        // Log l'erreur avec Sentry
        captureException(timeoutError, {
          tags: {
            api_endpoint: endpoint,
            error_type: 'timeout',
          },
          extra: {
            method,
            url,
            requestBody: data,
            timeout,
          },
        });

        if (showErrorToast) {
          toast.error(
            'La connexion au serveur prend trop de temps. Veuillez réessayer.',
          );
        }

        throw timeoutError;
      }

      // Gérer les erreurs réseau
      if (
        error.message === 'Failed to fetch' ||
        error.message === 'Network request failed'
      ) {
        const networkError = new Error(
          'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
        );

        // Log l'erreur avec Sentry
        captureException(networkError, {
          tags: {
            api_endpoint: endpoint,
            error_type: 'network',
          },
          extra: {
            method,
            url,
            originalError: error.message,
          },
        });

        if (showErrorToast) {
          toast.error(
            'Problème de connexion. Vérifiez votre réseau et réessayez.',
          );
        }

        throw networkError;
      }

      // Propager toutes les autres erreurs
      throw error;
    }
  }

  /**
   * Upload de fichiers via FormData
   * @param {string} endpoint - L'endpoint à appeler
   * @param {FormData} formData - Les données du formulaire à envoyer
   * @param {Object} options - Options supplémentaires pour la requête
   * @returns {Promise<any>} - La réponse JSON ou une erreur
   */
  static async uploadFile(endpoint, formData, options = {}) {
    return this.request('POST', endpoint, formData, {
      headers: {
        // Ne pas définir le Content-Type pour l'upload de fichiers
        // Le navigateur le définira automatiquement avec la boundary
      },
      ...options,
      // Ne pas JSON.stringify le FormData
      body: formData,
    });
  }
}

export default ApiService;
