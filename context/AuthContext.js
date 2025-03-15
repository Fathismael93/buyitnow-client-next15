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

  /**
   * Enregistrement d'un nouvel utilisateur avec validation et gestion d'erreurs améliorées
   * @param {Object} userData - Données de l'utilisateur à inscrire
   * @param {string} userData.name - Nom complet de l'utilisateur
   * @param {string} userData.phone - Numéro de téléphone
   * @param {string} userData.email - Adresse email
   * @param {string} userData.password - Mot de passe
   * @returns {Promise<void>}
   */
  const registerUser = useCallback(
    async ({ name, phone, email, password }) => {
      // Vérifier si une requête est déjà en cours
      if (loading) return;

      // Controller pour annuler la requête si nécessaire
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        setLoading(true);
        setError(null);

        // Validation de sécurité côté client
        if (!name?.trim() || !phone?.trim() || !email?.trim() || !password) {
          throw new Error('Tous les champs sont requis');
        }

        // Nettoyage et sanitisation des données
        const sanitizedData = {
          name: name.trim(),
          phone: phone.trim().replace(/\s/g, ''),
          email: email.trim().toLowerCase(),
          password: password,
        };

        // Vérification de sécurité basique pour éviter les attaques
        if (
          sanitizedData.name.length > 100 ||
          sanitizedData.email.length > 254
        ) {
          throw new Error(
            'Les données fournies dépassent la taille maximale autorisée',
          );
        }

        // Timeout pour éviter que la requête reste bloquée
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            body: JSON.stringify(sanitizedData),
            signal, // Ajouter le signal pour permettre l'annulation
          },
        );

        clearTimeout(timeoutId);

        // Gestion des erreurs HTTP
        if (!response.ok) {
          // Tenter de lire le corps de la réponse pour des détails d'erreur
          const errorData = await response.json().catch(() => ({}));

          // Gérer les différents cas d'erreur
          if (response.status === 409) {
            throw new Error(errorData.message || 'Cet email est déjà utilisé');
          } else if (response.status === 400) {
            throw new Error(
              errorData.message || "Données d'inscription invalides",
            );
          } else if (response.status === 429) {
            throw new Error(
              "Trop de tentatives d'inscription. Veuillez réessayer plus tard",
            );
          } else if (response.status >= 500) {
            throw new Error(
              'Le serveur a rencontré un problème. Veuillez réessayer plus tard',
            );
          } else {
            throw new Error(
              errorData.message ||
                "Une erreur est survenue lors de l'inscription",
            );
          }
        }

        // Analyser la réponse avec gestion d'erreur
        const data = await response.json().catch(() => {
          throw new Error("Erreur lors de l'analyse de la réponse du serveur");
        });

        if (data?.user) {
          // Enregistrer des métriques de succès (si applicable)
          try {
            if (typeof window !== 'undefined' && window.performance) {
              const registrationTime = performance.now();
              console.info(
                `Registration successful in ${Math.round(registrationTime)}ms`,
              );
            }
          } catch (e) {
            // Ignorer les erreurs de métriques
          }

          // Inscription réussie
          toast.success(
            'Compte créé avec succès! Vous pouvez maintenant vous connecter.',
            { autoClose: 5000 },
          );

          // Redirection vers la page de connexion après un court délai
          setTimeout(() => {
            router.push('/login');
          }, 300);
        } else {
          // Succès sans donnée utilisateur (cas rare mais possible)
          toast.success('Compte créé, veuillez vous connecter', {
            autoClose: 5000,
          });
          router.push('/login');
        }
      } catch (error) {
        // Gérer les erreurs d'annulation séparément
        if (error.name === 'AbortError') {
          setError(
            "La requête d'inscription a pris trop de temps, veuillez réessayer",
          );
          toast.error(
            'La requête a expiré. Veuillez vérifier votre connexion et réessayer.',
          );
        } else {
          // Gérer les autres erreurs
          const errorMessage =
            error?.message || "Une erreur est survenue lors de l'inscription";
          setError(errorMessage);
          toast.error(errorMessage);

          // Journaliser l'erreur pour le monitoring
          captureException(error, {
            tags: {
              action: 'register_user',
              errorType: error.name || 'unknown',
            },
            extra: {
              email: email
                ? `${email.substring(0, 3)}...${email.split('@')[1] || ''}`
                : 'unknown',
              response: error.response || null,
            },
          });
        }
      } finally {
        setLoading(false);
        // Nettoyer les ressources
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }
    },
    [router],
  );

  /**
   * Charge les données de l'utilisateur avec gestion optimisée des erreurs et de la performance
   * @param {Object} options - Options de chargement
   * @param {boolean} options.redirect - Si true, redirige vers /me après chargement
   * @param {number} options.timeout - Timeout en ms (défaut: 8000)
   * @returns {Promise<Object|null>} - Les données utilisateur ou null
   */
  const loadUser = useCallback(
    async (options = {}) => {
      const { redirect = true, timeout = 8000, retry = true } = options;

      // Si déjà en cours de chargement, ne pas relancer
      if (loading) return null;

      // Controller pour gérer le timeout et l'annulation
      const controller = new AbortController();
      const signal = controller.signal;

      // Définir le timeout
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let retryCount = 0;
      const MAX_RETRIES = retry ? 2 : 0;

      const executeRequest = async () => {
        try {
          setLoading(true);
          setError(null);

          // Mesurer le temps de chargement pour les performances
          const startTime = performance.now();

          // Ajouter un paramètre unique pour éviter le cache navigateur
          const cacheBuster = `_=${Date.now()}`;
          const url = `/api/auth/session?update=${cacheBuster}`;

          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              'X-Requested-With': 'XMLHttpRequest',
            },
            signal,
          });

          // Mesurer le temps de réponse
          const responseTime = performance.now() - startTime;

          // Vérifier si la requête a réussi
          if (!response.ok) {
            // Gérer différemment selon le code d'erreur
            if (response.status === 401 || response.status === 403) {
              // Non authentifié - effacer l'utilisateur sans erreur
              setUser(null);
              clearTimeout(timeoutId);
              return null;
            }

            if (response.status === 429) {
              throw new Error(
                'Trop de requêtes. Veuillez réessayer dans quelques instants.',
              );
            }

            throw new Error(
              `Erreur ${response.status}: Échec de chargement des données utilisateur`,
            );
          }

          // Analyser les données avec gestion d'erreur
          const data = await response.json().catch(() => {
            throw new Error("Erreur lors de l'analyse de la réponse");
          });

          // Nettoyer le timeout car la requête est terminée
          clearTimeout(timeoutId);

          // Journaliser les performances en développement
          if (process.env.NODE_ENV === 'development') {
            console.info(`User data loaded in ${Math.round(responseTime)}ms`);
          }

          if (data?.user) {
            // Éviter les mises à jour inutiles pour optimiser les rendus
            setUser((prevUser) => {
              // Comparer les ID pour éviter de mettre à jour si l'utilisateur n'a pas changé
              if (prevUser?._id === data.user._id) {
                return prevUser;
              }
              return data.user;
            });

            // Rediriger si demandé
            if (redirect) {
              router.push('/me');
            }

            return data.user;
          } else {
            // Aucun utilisateur trouvé
            setUser(null);
            return null;
          }
        } catch (error) {
          // Annulation - généralement due au timeout
          if (error.name === 'AbortError') {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.warn(
                `Tentative ${retryCount}/${MAX_RETRIES} de chargement des données utilisateur...`,
              );
              return await executeRequest();
            }
            throw new Error(
              'La requête a pris trop de temps. Vérifiez votre connexion internet.',
            );
          }

          // Autres erreurs - propager
          throw error;
        }
      };

      try {
        const user = await executeRequest();
        return user;
      } catch (error) {
        // Gérer et logger l'erreur finale
        const errorMessage =
          error?.message ||
          "Impossible de charger les informations de l'utilisateur";
        setError(errorMessage);

        // N'afficher une notification que si c'est une erreur critique
        if (!error.message?.includes('pris trop de temps')) {
          toast.error(errorMessage, { autoClose: 4000 });
        }

        captureException(error, {
          tags: {
            action: 'load_user',
            errorType: error.name || 'unknown',
          },
          extra: {
            url: '/api/auth/session?update=',
            retryCount,
            userPresent: !!user,
          },
        });

        return null;
      } finally {
        setLoading(false);

        // S'assurer que le contrôleur est nettoyé
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }
    },
    [router, user, loading],
  );

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
