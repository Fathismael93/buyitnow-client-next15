'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { toast } from 'react-toastify';
// eslint-disable-next-line no-unused-vars
import ApiService from '@/services/api';
import { setUser as setSentryUser } from '@/monitoring/sentry';
import { captureException } from '@/monitoring/sentry';

const AuthContext = createContext();

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const router = useRouter();

  // Enregistrer l'utilisateur dans Sentry quand il change
  useEffect(() => {
    if (user) {
      setSentryUser(user);
    } else {
      setSentryUser(null);
    }
  }, [user]);

  const registerUser = useCallback(
    async ({ name, phone, email, password }) => {
      try {
        setLoading(true);
        setError(null);

        // Validation de base côté client
        if (!name || !phone || !email || !password) {
          throw new Error('Tous les champs sont requis');
        }

        if (password.length < 6) {
          throw new Error(
            'Le mot de passe doit contenir au moins 6 caractères',
          );
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              phone,
              email,
              password,
            }),
          },
        );

        const data = await response.json();

        if (data?.user) {
          toast.success(
            'Compte créé avec succès! Vous pouvez maintenant vous connecter.',
          );
          router.push('/login');
        } else {
          toast.error(
            data?.message || "Une erreur est survenue lors de l'inscription",
          );
        }
      } catch (error) {
        setError(
          error?.message || "Une erreur est survenue lors de l'inscription",
        );
        toast.error(
          error?.message || "Une erreur est survenue lors de l'inscription",
        );
        captureException(error, { tags: { action: 'register_user' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/auth/session?update=');

      if (!response.ok) {
        throw new Error('Échec de chargement des données utilisateur');
      }

      const data = await response.json();

      if (data?.user) {
        setUser(data.user);
        router.push('/me');
      }
    } catch (error) {
      setError(
        error?.message ||
          "Impossible de charger les informations de l'utilisateur",
      );
      captureException(error, { tags: { action: 'load_user' } });
    } finally {
      setLoading(false);
    }
  }, [router]);

  const updateProfile = useCallback(
    async (formData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me/update`,
          {
            method: 'PUT',
            body: formData,
          },
        );

        const data = await response.json();

        if (data?.updatedUser) {
          loadUser();
          toast.success('Profil mis à jour avec succès!');
        } else {
          toast.error(
            data?.message ||
              'Une erreur est survenue lors de la mise à jour du profil',
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            'Une erreur est survenue lors de la mise à jour du profil',
        );
        toast.error(
          error?.message ||
            'Une erreur est survenue lors de la mise à jour du profil',
        );
        captureException(error, { tags: { action: 'update_profile' } });
      } finally {
        setLoading(false);
      }
    },
    [loadUser],
  );

  const updatePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      try {
        setLoading(true);
        setError(null);

        // Validation basique côté client
        if (!currentPassword || !newPassword) {
          throw new Error('Les deux mots de passe sont requis');
        }

        if (newPassword.length < 6) {
          throw new Error(
            'Le nouveau mot de passe doit contenir au moins 6 caractères',
          );
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me/update_password`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              user,
            }),
          },
        );

        const data = await response.json();

        if (data?.success) {
          toast.success('Mot de passe mis à jour avec succès');
          router.replace('/me');
        } else {
          throw new Error(
            data?.message || 'Échec de la mise à jour du mot de passe',
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            'Une erreur est survenue lors de la mise à jour du mot de passe',
        );
        toast.error(
          error?.message ||
            'Une erreur est survenue lors de la mise à jour du mot de passe',
        );
        captureException(error, { tags: { action: 'update_password' } });
      } finally {
        setLoading(false);
      }
    },
    [router, user],
  );

  const addNewAddress = useCallback(
    async (address) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/address`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(address),
          },
        );

        const data = await response.json();

        if (data?.address) {
          toast.success('Adresse ajoutée avec succès');
          router.push('/me');
        } else {
          toast.error(
            data?.message ||
              "Une erreur est survenue lors de l'ajout de l'adresse",
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            "Une erreur est survenue lors de l'ajout de l'adresse",
        );
        toast.error(
          error?.message ||
            "Une erreur est survenue lors de l'ajout de l'adresse",
        );
        captureException(error, { tags: { action: 'add_address' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const updateAddress = useCallback(
    async (id, address) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(address),
          },
        );

        const data = await response.json();

        if (data?.address) {
          setUpdated(true);
          toast.success('Adresse mise à jour avec succès');
          router.replace(`/address/${id}`);
        } else {
          toast.error(
            data?.message ||
              "Une erreur est survenue lors de la mise à jour de l'adresse",
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            "Une erreur est survenue lors de la mise à jour de l'adresse",
        );
        toast.error(
          error?.message ||
            "Une erreur est survenue lors de la mise à jour de l'adresse",
        );
        captureException(error, { tags: { action: 'update_address' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const deleteAddress = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
          {
            method: 'DELETE',
          },
        );

        const data = await response.json();

        if (data?.success) {
          toast.success('Adresse supprimée avec succès');
          router.push('/me');
        } else {
          toast.error(
            data?.message ||
              "Une erreur est survenue lors de la suppression de l'adresse",
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            "Une erreur est survenue lors de la suppression de l'adresse",
        );
        toast.error(
          error?.message ||
            "Une erreur est survenue lors de la suppression de l'adresse",
        );
        captureException(error, { tags: { action: 'delete_address' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const sendEmail = useCallback(
    async (newEmail) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/emails`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newEmail),
          },
        );

        const data = await response.json();

        if (data?.success) {
          toast.success('Votre message a été envoyé avec succès');
          router.push('/me');
        } else {
          toast.error(
            data?.message ||
              "Une erreur est survenue lors de l'envoi de l'email",
          );
        }
      } catch (error) {
        setError(
          error?.message ||
            "Une erreur est survenue lors de l'envoi de l'email",
        );
        toast.error(
          error?.message ||
            "Une erreur est survenue lors de l'envoi de l'email",
        );
        captureException(error, { tags: { action: 'send_email' } });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const clearErrors = useCallback(() => {
    setError(null);
  }, []);

  // Utiliser useMemo pour éviter des re-renders inutiles
  const contextValue = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
