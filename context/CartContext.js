'use client';

import { DECREASE } from '@/helpers/constants';
import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { toast } from 'react-toastify';
import { captureException } from '@/monitoring/sentry';
// eslint-disable-next-line no-unused-vars
import ApiService from '@/services/api';
import { useLocalStorage } from '@/hooks/useCustomHooks';

const CartContext = createContext();

// eslint-disable-next-line react/prop-types
export const CartProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  // Utiliser localStorage pour persister le panier même si l'utilisateur rafraîchit la page
  const [localCart, setLocalCart] = useLocalStorage('buyitnow_cart', {
    count: 0,
    items: [],
  });

  // Synchroniser le cart local avec le cart du serveur lors de l'initialisation
  useEffect(() => {
    if (localCart.count > 0 && cart.length === 0) {
      setCartToState();
    }
  }, [localCart.count, cart.length]);

  const setCartToState = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération du panier: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data) {
        setCart(data?.cart || []);
        setCartCount(data?.cartCount || 0);

        // Mettre à jour le localStorage
        setLocalCart({
          count: data?.cartCount || 0,
          items: data?.cart || [],
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du panier:', error);
      captureException(error, { tags: { action: 'get_cart' } });

      // En cas d'erreur, utiliser les données du localStorage comme fallback
      if (localCart.items.length > 0) {
        setCart(localCart.items);
        setCartCount(localCart.count);
        toast.info('Utilisation des données de panier locales');
      }
    } finally {
      setLoading(false);
    }
  }, [localCart.items, localCart.count, setLocalCart]);

  const addItemToCart = useCallback(
    async ({ product }) => {
      try {
        setLoading(true);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productId: product,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Erreur lors de l'ajout au panier: ${response.status}`,
          );
        }

        const data = await response.json();

        if (data.cartAdded) {
          await setCartToState();
          toast.success('Produit ajouté au panier');
        } else {
          toast.error(
            data.message || "Une erreur est survenue lors de l'ajout au panier",
          );
        }
      } catch (error) {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
        captureException(error, { tags: { action: 'add_to_cart' } });
      } finally {
        setLoading(false);
      }
    },
    [setCartToState],
  );

  const updateCart = useCallback(
    async (product, value) => {
      if (value === DECREASE && product.quantity === 1) {
        toast.error(
          "Il ne reste qu'une unité ! Supprimez cet article si vous n'en voulez pas !",
        );
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product,
              value,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la mise à jour du panier: ${response.status}`,
          );
        }

        const data = await response.json();

        if (data) {
          await setCartToState();
          toast.success(data);
        } else {
          toast.error(
            'Une erreur est survenue lors de la mise à jour du panier',
          );
        }
      } catch (error) {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
        captureException(error, { tags: { action: 'update_cart' } });
      } finally {
        setLoading(false);
      }
    },
    [setCartToState],
  );

  const deleteItemFromCart = useCallback(
    async (id) => {
      try {
        setLoading(true);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${id}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la suppression du panier: ${response.status}`,
          );
        }

        const data = await response.json();

        if (data) {
          await setCartToState();
          toast.success('Article supprimé du panier');
        } else {
          toast.error(
            "Une erreur est survenue lors de la suppression de l'article",
          );
        }
      } catch (error) {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
        captureException(error, { tags: { action: 'delete_from_cart' } });
      } finally {
        setLoading(false);
      }
    },
    [setCartToState],
  );

  const saveOnCheckout = useCallback(({ amount, tax, totalAmount }) => {
    setCheckoutInfo({
      amount,
      tax,
      totalAmount,
    });
  }, []);

  // Calcul du total du panier (utile pour l'affichage)
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0);
  }, [cart]);

  // Utiliser useMemo pour éviter des re-renders inutiles
  const contextValue = useMemo(
    () => ({
      loading,
      cart,
      cartCount,
      cartTotal,
      checkoutInfo,
      orderInfo,
      setLoading,
      setCartToState,
      setOrderInfo,
      addItemToCart,
      updateCart,
      saveOnCheckout,
      deleteItemFromCart,
    }),
    [
      loading,
      cart,
      cartCount,
      cartTotal,
      checkoutInfo,
      orderInfo,
      setLoading,
      setCartToState,
      setOrderInfo,
      addItemToCart,
      updateCart,
      saveOnCheckout,
      deleteItemFromCart,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

export default CartContext;
