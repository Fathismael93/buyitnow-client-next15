'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { captureException } from '@/monitoring/sentry';

const OrderContext = createContext();

// eslint-disable-next-line react/prop-types
export const OrderProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [secret, setSecret] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [shippingInfo, setShippinInfo] = useState(null);
  const [shippingStatus, setShippingStatus] = useState(true);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const addOrder = useCallback(
    async (orderInfo) => {
      try {
        setLoading(true);

        // Validation basique côté client
        if (
          !orderInfo ||
          !orderInfo.orderItems ||
          orderInfo.orderItems.length === 0
        ) {
          toast.error('Votre panier est vide');
          return;
        }

        if (!orderInfo.shippingInfo) {
          toast.error('Veuillez sélectionner une adresse de livraison');
          return;
        }

        if (!orderInfo.paymentInfo || !orderInfo.paymentInfo.typePayment) {
          toast.error('Veuillez sélectionner un mode de paiement');
          return;
        }

        // Crypter les données sensibles de paiement
        const secureOrderInfo = {
          ...orderInfo,
          paymentInfo: {
            ...orderInfo.paymentInfo,
            // Ne pas envoyer le numéro de carte en clair
            paymentAccountNumber: `xxxx-xxxx-xxxx-${orderInfo.paymentInfo.paymentAccountNumber.slice(-4)}`,
          },
        };

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders/webhook`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(secureOrderInfo),
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la création de la commande: ${response.status}`,
          );
        }

        const data = await response.json();

        if (data?.success) {
          setSecret(data?.id);

          // Log de l'événement de conversion (pour analytics)
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'purchase', {
              transaction_id: data.id,
              value: orderInfo.paymentInfo.amountPaid,
              currency: 'EUR',
              items: orderInfo.orderItems.map((item) => ({
                id: item.product,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                price: item.price,
              })),
            });
          }

          toast.success('Commande créée avec succès!');
          router.push('/confirmation');
        } else {
          setLowStockProducts(data?.inavailableStockProducts);
          toast.error(
            'Certains produits de votre panier ne sont plus disponibles en quantité suffisante',
          );
          router.push('/error');
        }
      } catch (error) {
        setError(
          error?.message ||
            'Une erreur est survenue lors de la création de la commande',
        );
        toast.error('Une erreur est survenue. Veuillez réessayer.');
        captureException(error, { tags: { action: 'create_order' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const fetchOrderDetails = useCallback(async (orderId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération de la commande: ${response.status}`,
        );
      }

      const data = await response.json();

      return data.order;
    } catch (error) {
      setError(
        error?.message ||
          'Une erreur est survenue lors de la récupération des détails de la commande',
      );
      toast.error('Une erreur est survenue. Veuillez réessayer.');
      captureException(error, { tags: { action: 'get_order_details' } });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
  }, []);

  // Vérifier l'état de la commande
  const checkOrderStatus = useCallback(async (orderId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(
          `Erreur lors de la vérification du statut: ${response.status}`,
        );
      }

      const data = await response.json();

      return data.status;
    } catch (error) {
      setError(
        error?.message ||
          'Une erreur est survenue lors de la vérification du statut de la commande',
      );
      captureException(error, { tags: { action: 'check_order_status' } });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utiliser useMemo pour éviter des re-renders inutiles
  const contextValue = useMemo(
    () => ({
      error,
      updated,
      secret,
      paymentTypes,
      addresses,
      shippingInfo,
      shippingStatus,
      deliveryPrice,
      lowStockProducts,
      loading,
      setPaymentTypes,
      setAddresses,
      setShippinInfo,
      setShippingStatus,
      setDeliveryPrice,
      addOrder,
      fetchOrderDetails,
      checkOrderStatus,
      setUpdated,
      clearErrors,
    }),
    [
      error,
      updated,
      secret,
      paymentTypes,
      addresses,
      shippingInfo,
      shippingStatus,
      deliveryPrice,
      lowStockProducts,
      loading,
      setPaymentTypes,
      setAddresses,
      setShippinInfo,
      setShippingStatus,
      setDeliveryPrice,
      addOrder,
      fetchOrderDetails,
      checkOrderStatus,
      setUpdated,
      clearErrors,
    ],
  );

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;
