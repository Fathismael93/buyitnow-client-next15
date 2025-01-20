'use client';

import { DECREASE } from '@/helpers/constants';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
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
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
      );

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
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
        {
          productId: product,
        },
      );

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
        const { data } = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
          {
            product,
            value,
          },
        );

        if (data) {
          setCartToState();
          toast.success(data);
        } else {
          toast.error(
            "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
          );
        }
      } catch (error) {
        setError(error?.response?.data?.message);
      }
    }
  };

  const deleteItemFromCart = async (id) => {
    try {
      const { data } = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${id}`,
      );

      if (data) {
        setCartToState();
        toast.success(data);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
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
        cart,
        cartCount,
        checkoutInfo,
        orderInfo,
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
