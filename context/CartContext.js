'use client';

import { DECREASE, INCREASE } from '@/helpers/constants';
import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { toast } from 'react-toastify';
import { captureException } from '@/monitoring/sentry';
import { useLocalStorage } from '@/hooks/useCustomHooks';
import { recordMetric } from '@/monitoring/sentry';

const CartContext = createContext();

// Constantes pour optimiser les performances
const CART_UPDATE_DEBOUNCE = 500; // ms
const API_TIMEOUT = 10000; // ms
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000; // ms

// eslint-disable-next-line react/prop-types
export const CartProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [error, setError] = useState(null);

  // Référence pour éviter les requêtes en double
  const pendingRequests = useRef(new Set());
  const isFirstLoad = useRef(true);

  // Utiliser localStorage pour persister le panier
  const [localCart, setLocalCart] = useLocalStorage('buyitnow_cart', {
    count: 0,
    items: [],
    lastUpdated: null,
  });

  // Synchroniser le panier local avec le panier du serveur lors de l'initialisation
  useEffect(() => {
    // N'exécuter qu'au premier montage
    if (isFirstLoad.current && localCart.count > 0 && cart.length === 0) {
      setCartToState();
      isFirstLoad.current = false;
    }
  }, [localCart.count, cart.length]);

  // Fonction utilitaire pour les requêtes API avec retry
  const fetchWithRetry = useCallback(
    async (url, options, attemptNumber = 0) => {
      const requestId = `${options.method || 'GET'}-${url}-${Date.now()}`;

      // Éviter les requêtes en double
      if (pendingRequests.current.has(requestId)) {
        return null;
      }

      pendingRequests.current.add(requestId);
      const startTime = Date.now();

      try {
        // Ajouter un timeout à la requête
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })
          .then((result) => {
            console.log('result in setCarttoState');
            console.log(result);
          })
          .catch((error) => {
            console.log('error in setCarttoState');
            console.log(error);
          });

        clearTimeout(timeoutId);

        const response = {};

        // Mesurer la performance de la requête
        const duration = Date.now() - startTime;
        recordMetric(`cart.api.${options.method || 'GET'}.duration`, duration);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Erreur ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        // Gérer les timeouts et les erreurs réseau avec retry
        if (
          (error.name === 'AbortError' || error.message.includes('network')) &&
          attemptNumber < RETRY_ATTEMPTS
        ) {
          pendingRequests.current.delete(requestId);

          // Attendre avant de réessayer
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * (attemptNumber + 1)),
          );

          return fetchWithRetry(url, options, attemptNumber + 1);
        }

        throw error;
      } finally {
        pendingRequests.current.delete(requestId);
      }
    },
    [],
  );

  const setCartToState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      const response = await fetchWithRetry(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        },
      );

      if (response) {
        // Normaliser les données du panier
        const normalizedCart =
          response.cart?.map((item) => ({
            ...item,
            // S'assurer que la quantité est un nombre
            quantity: parseInt(item.quantity, 10) || 1,
          })) || [];

        setCart(normalizedCart);
        setCartCount(response.cartCount || 0);

        // Mettre à jour le localStorage avec timestamp
        setLocalCart({
          count: response.cartCount || 0,
          items: normalizedCart,
          lastUpdated: Date.now(),
        });

        // Mesurer la performance du chargement
        const loadTime = Date.now() - startTime;
        recordMetric('cart.load.time', loadTime);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du panier:', error);

      captureException(error, {
        tags: { action: 'get_cart' },
        extra: { context: 'setCartToState' },
      });

      // En cas d'erreur, utiliser les données du localStorage comme fallback
      if (localCart.items.length > 0) {
        setCart(localCart.items);
        setCartCount(localCart.count);
        toast.info('Utilisation des données de panier locales', {
          autoClose: 3000,
        });
      }

      setError('Erreur lors du chargement du panier');
    } finally {
      setLoading(false);
    }
  }, [fetchWithRetry, localCart.items, localCart.count, setLocalCart]);

  const addItemToCart = useCallback(
    async ({ product, quantity = 1 }) => {
      if (!product) {
        toast.error('Produit invalide');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const startTime = Date.now();
        const response = await fetchWithRetry(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
          {
            method: 'POST',
            body: JSON.stringify({
              productId: product,
              quantity,
            }),
          },
        );

        if (response?.success) {
          await setCartToState();

          // Mesurer performance
          const addTime = Date.now() - startTime;
          recordMetric('cart.add.time', addTime);

          toast.success('Produit ajouté au panier', {
            position: 'bottom-right',
            autoClose: 3000,
          });
        } else {
          toast.error(
            response?.message ||
              "Une erreur est survenue lors de l'ajout au panier",
            { position: 'bottom-right' },
          );
        }
      } catch (error) {
        console.error("Erreur lors de l'ajout au panier:", error);

        captureException(error, {
          tags: { action: 'add_to_cart' },
          extra: { product, quantity },
        });

        toast.error('Une erreur est survenue. Veuillez réessayer.', {
          position: 'bottom-right',
        });

        setError("Erreur lors de l'ajout au panier");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithRetry, setCartToState],
  );

  const updateCart = useCallback(
    async (product, action) => {
      // Validation préliminaire
      if (!product || !action) {
        return;
      }

      // Si DECREASE et quantité = 1, empêcher la mise à jour
      if (action === DECREASE && product.quantity === 1) {
        toast.info(
          "Quantité minimale atteinte. Pour supprimer l'article, utilisez le bouton Supprimer.",
          { position: 'bottom-right' },
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Mise à jour optimiste côté client
        const updatedCart = cart.map((item) => {
          if (item._id === product._id) {
            const newQuantity =
              action === INCREASE
                ? Math.min(item.quantity + 1, product.product.stock)
                : Math.max(item.quantity - 1, 1);

            return { ...item, quantity: newQuantity };
          }
          return item;
        });

        setCart(updatedCart);

        // Mise à jour côté serveur
        const response = await fetchWithRetry(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
          {
            method: 'PUT',
            body: JSON.stringify({
              product,
              value: action,
            }),
          },
        );

        if (response) {
          // Rafraîchir le panier après la mise à jour
          await setCartToState();

          if (action === INCREASE) {
            toast.success('Quantité augmentée', {
              position: 'bottom-right',
              autoClose: 2000,
            });
          } else {
            toast.success('Quantité diminuée', {
              position: 'bottom-right',
              autoClose: 2000,
            });
          }
        } else {
          // Annuler la mise à jour optimiste en cas d'échec
          await setCartToState();

          toast.error('La mise à jour du panier a échoué, veuillez réessayer', {
            position: 'bottom-right',
          });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du panier:', error);

        captureException(error, {
          tags: { action: 'update_cart' },
          extra: { product, updateAction: action },
        });

        // Restaurer l'état du panier
        await setCartToState();

        toast.error('Une erreur est survenue. Veuillez réessayer.', {
          position: 'bottom-right',
        });

        setError('Erreur lors de la mise à jour du panier');
      } finally {
        setLoading(false);
      }
    },
    [fetchWithRetry, setCartToState, cart],
  );

  const deleteItemFromCart = useCallback(
    async (id) => {
      if (!id) {
        toast.error('ID de produit invalide');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Mise à jour optimiste - Supprimer l'élément de l'UI immédiatement
        const updatedCart = cart.filter((item) => item._id !== id);
        setCart(updatedCart);
        setCartCount((prev) => Math.max(0, prev - 1));

        // Mettre à jour le cache local
        setLocalCart({
          count: updatedCart.length,
          items: updatedCart,
          lastUpdated: Date.now(),
        });

        // Requête API pour supprimer du serveur
        const response = await fetchWithRetry(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${id}`,
          { method: 'DELETE' },
        );

        if (response?.success) {
          // Mettre à jour le panier après la suppression
          await setCartToState();

          toast.success('Article supprimé du panier', {
            position: 'bottom-right',
            autoClose: 3000,
          });
        } else {
          // Si la suppression côté serveur échoue, restaurer l'état
          await setCartToState();

          toast.error(
            response?.message ||
              "Une erreur est survenue lors de la suppression de l'article",
            { position: 'bottom-right' },
          );
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du panier:', error);

        captureException(error, {
          tags: { action: 'delete_from_cart' },
          extra: { itemId: id },
        });

        // Restaurer l'état
        await setCartToState();

        toast.error('Une erreur est survenue. Veuillez réessayer.', {
          position: 'bottom-right',
        });

        setError('Erreur lors de la suppression du panier');
      } finally {
        setLoading(false);
      }
    },
    [fetchWithRetry, setCartToState, cart, setLocalCart],
  );

  const saveOnCheckout = useCallback(
    ({ amount, tax = 0, totalAmount }) => {
      // Valider les données
      const validAmount = parseFloat(amount) || 0;
      const validTax = parseFloat(tax) || 0;
      const validTotal = parseFloat(totalAmount) || validAmount + validTax;

      setCheckoutInfo({
        amount: validAmount,
        tax: validTax,
        totalAmount: validTotal,
        items: cart,
        timestamp: Date.now(),
      });

      // Enregistrer dans localStorage pour une reprise ultérieure si nécessaire
      try {
        localStorage.setItem(
          'buyitnow_checkout',
          JSON.stringify({
            amount: validAmount,
            tax: validTax,
            totalAmount: validTotal,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        // Ignorer les erreurs de localStorage
        console.warn(
          'Impossible de sauvegarder les infos de checkout dans localStorage',
        );
      }
    },
    [cart],
  );

  // Calculer le total du panier avec mémorisation pour éviter les recalculs inutiles
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      // Validation pour éviter NaN
      const price = parseFloat(item.product?.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return total + price * quantity;
    }, 0);
  }, [cart]);

  // Nettoyer les erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Vider le panier (utile après un achat réussi)
  const clearCart = useCallback(async () => {
    try {
      setLoading(true);

      // Supprimer chaque élément du panier
      for (const item of cart) {
        await fetchWithRetry(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${item._id}`,
          { method: 'DELETE' },
        );
      }

      // Réinitialiser l'état local
      setCart([]);
      setCartCount(0);
      setLocalCart({
        count: 0,
        items: [],
        lastUpdated: Date.now(),
      });

      toast.success('Panier vidé avec succès', {
        position: 'bottom-right',
      });
    } catch (error) {
      console.error('Erreur lors du vidage du panier:', error);

      captureException(error, {
        tags: { action: 'clear_cart' },
      });

      toast.error('Impossible de vider le panier. Veuillez réessayer.', {
        position: 'bottom-right',
      });
    } finally {
      setLoading(false);
    }
  }, [cart, fetchWithRetry, setLocalCart]);

  // Valeur du contexte avec mémorisation pour éviter les re-renders inutiles
  const contextValue = useMemo(
    () => ({
      loading,
      cart,
      cartCount,
      cartTotal,
      checkoutInfo,
      orderInfo,
      error,
      setLoading,
      setCartToState,
      setOrderInfo,
      addItemToCart,
      updateCart,
      saveOnCheckout,
      deleteItemFromCart,
      clearError,
      clearCart,
    }),
    [
      loading,
      cart,
      cartCount,
      cartTotal,
      checkoutInfo,
      orderInfo,
      error,
      setLoading,
      setCartToState,
      setOrderInfo,
      addItemToCart,
      updateCart,
      saveOnCheckout,
      deleteItemFromCart,
      clearError,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

export default CartContext;
