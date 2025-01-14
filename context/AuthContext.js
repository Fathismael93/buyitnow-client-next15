"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import React, { createContext, useState } from "react";
import { toast } from "react-toastify";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const router = useRouter();

  const registerUser = async ({ name, phone, email, password }) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        {
          name,
          phone,
          email,
          password,
        }
      );

      if (data?.user) {
        router.push("/login");
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get("/api/auth/session?update");

      if (data?.user) {
        setUser(data.user);
        router.push("/me");
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
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (data?.updatedUser) {
        loadUser();
        setLoading(false);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
        );
      }
    } catch (error) {
      setLoading(false);
      setError(error?.response?.data?.message);
    }
  };

  const updatePassword = async ({ currentPassword, newPassword }) => {
    try {
      const { data } = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me/update_password`,
        {
          currentPassword,
          newPassword,
          user,
        }
      );

      if (data?.sucess) {
        toast.success("Password updated with success");
        router.replace("/me");
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const addNewAddress = async (address) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address`,
        address,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (data) {
        router.push("/me");
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const updateAddress = async (id, address) => {
    try {
      const { data } = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
        address
      );

      if (data?.address) {
        setUpdated(true);
        router.replace(`/address/${id}`);
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const deleteAddress = async (id) => {
    try {
      const { data } = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`
      );

      if (data?.success) {
        router.push("/me");
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
        );
      }
    } catch (error) {
      setError(error?.response?.data?.message);
    }
  };

  const sendEmail = async (newEmail) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/emails`,
        newEmail,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (data) {
        router.push("/me");
      } else {
        toast.error(
          "Il semblerait qu'une erreur soit survenue! Réessayer plus tard"
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
