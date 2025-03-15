/* eslint-disable react/prop-types */
'use client'; // Error boundaries must be Client Components

import React, { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Capturer l'erreur dans Sentry avec contexte
    Sentry.captureException(error, {
      tags: {
        component: 'LoginError',
        page: 'login',
      },
      extra: {
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack,
      },
    });
  }, [error]);

  // Déterminer un message adapté à l'utilisateur
  const getUserFriendlyMessage = () => {
    if (
      error?.message?.includes('network') ||
      error?.message?.includes('fetch')
    ) {
      return 'Problème de connexion au serveur. Vérifiez votre connexion internet et réessayez.';
    }

    if (
      error?.message?.includes('auth') ||
      error?.message?.includes('credentials')
    ) {
      return "Problème d'authentification. Veuillez réessayer ou utiliser la fonction 'Mot de passe oublié'.";
    }

    return "Une erreur s'est produite pendant la connexion à votre compte. Veuillez réessayer plus tard.";
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h2
                className="text-lg font-medium text-red-800"
                id="error-heading"
              >
                Erreur de connexion
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4" aria-live="assertive">
            {getUserFriendlyMessage()}
          </p>

          {process.env.NODE_ENV !== 'production' && error?.message && (
            <div className="mb-4 p-3 bg-gray-100 rounded text-sm text-gray-800 font-mono overflow-auto">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => reset()}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              autoFocus
              aria-describedby="error-heading"
            >
              Réessayer
            </button>

            <Link
              href="/"
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/register"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Créer un compte
            </Link>
            <span className="text-gray-500 mx-2">•</span>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mot de passe oublié
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
