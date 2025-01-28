'use client';

import { DECREASE } from '@/helpers/constants';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  const router = useRouter();

  useEffect(() => {
    setCartToState();
  }, []);

  const setCartToState = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart`);
      const data = await res.json();

      if (data) {
        setCart(data?.cart);
        setCartCount(data?.cartCount);
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const addItemToCart = async ({ product }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart`, {
        method: 'POST',
        body: JSON.stringify({
          productId: product,
        }),
      });

      const data = await res.json();

      if (data.cartAdded) {
        setCartToState();
        toast.success('Product added to cart');
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const updateCart = async (product, value) => {
    if (value === DECREASE && product.quantity === 1) {
      toast.error("It's only 1 unit ! Remove this item if you don't want it !");
    } else {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            product,
            value,
          }),
        });

        const data = await res.json();

        if (data) {
          setCartToState();
          toast.success(data);
          setLoading(false);
        } else {
          toast.error(
            "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
          );
          setLoading(false);
        }
      } catch (error) {
        setError(error?.response?.data?.message);
        setLoading(false);
      }
    }
  };

  const deleteItemFromCart = async (id) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${id}`,
        {
          method: 'DELETE',
        },
      );

      const data = await res.json();

      if (data) {
        setCartToState();
        toast.success(data);
        setLoading(false);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
        setLoading(false);
      }
    } catch (error) {
      setError(error?.response?.data?.message);
      setLoading(false);
    }
  };

  const saveOnCheckout = ({ amount, tax, totalAmount }) => {
    setCheckoutInfo({
      amount,
      tax,
      totalAmount,
    });
  };

  return (
    <CartContext.Provider
      value={{
        loading,
        cart,
        cartCount,
        checkoutInfo,
        orderInfo,
        setLoading,
        setCartToState,
        setOrderInfo,
        addItemToCart,
        updateCart,
        saveOnCheckout,
        deleteItemFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
