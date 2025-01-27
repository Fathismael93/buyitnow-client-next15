'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { createContext, useState } from 'react';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const router = useRouter();

  const registerUser = async ({ name, phone, email, password }) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            phone,
            email,
            password,
          }),
        },
      );

      const data = await res.json();

      if (data?.user) {
        router.push('/login');
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/auth/session?update=');
      const data = await res.json();

      if (data?.user) {
        setUser(data.user);
        router.push('/me');
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const updateProfile = async (formData) => {
    try {
      setLoading(true);

      const { data } = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me/update`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (data?.updatedUser) {
        loadUser();
        setLoading(false);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setLoading(false);
      setError(error?.response?.data?.message);
    }
  };

  const updatePassword = async ({ currentPassword, newPassword }) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me/update_password`,
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword,
            newPassword,
            user,
          }),
        },
      );

      const data = await res.json();

      if (data?.success) {
        toast.success('Password updated with success');
        router.replace('/me');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message);
      setError(error?.response?.data?.message);
    }
  };

  const addNewAddress = async (address) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address`,
        {
          method: 'POST',
          body: JSON.stringify(address),
        },
      );

      const data = await res.json();

      if (data) {
        router.push('/me');
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const updateAddress = async (id, address) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(address),
        },
      );

      const data = await res.json();

      if (data?.address) {
        setUpdated(true);
        router.replace(`/address/${id}`);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const deleteAddress = async (id) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
        {
          method: 'DELETE',
        },
      );

      const data = await res.json();

      if (data?.success) {
        router.push('/me');
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const sendEmail = async (newEmail) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/emails`, {
        method: 'POST',
        body: JSON.stringify(newEmail),
      });

      const data = await res.json();

      if (data) {
        router.push('/me');
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard",
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const clearErrors = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        error,
        loading,
        updated,
        setUpdated,
        setUser,
        setLoading,
        registerUser,
        updateProfile,
        updatePassword,
        addNewAddress,
        updateAddress,
        deleteAddress,
        sendEmail,

        clearErrors,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
