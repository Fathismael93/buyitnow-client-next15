/* eslint-disable react/prop-types */
'use client'; // Error boundaries must be Client Components

import React, { useEffect } from 'react';
import Link from 'next/link';
import { captureException } from '@/monitoring/sentry';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Capturer l'erreur pour l'analyse
    if (error) {
      captureException(error, {
        tags: {
          component: 'ProductPage',
          errorType: error.name || 'Unknown',
        },
        extra: {
          message: error.message,
          stack: error.stack,
        },
      });
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 md:p-8">
      <div className="max-w-lg w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
              <h3 className="text-lg font-medium text-red-800">
                Oups, un problème est survenu !
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Nous n'avons pas pu charger les informations de ce produit.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              {error?.message ||
                "Une erreur inattendue s'est produite lors du chargement du produit."}
            </p>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Réessayer
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Référence d'erreur: {error?.digest || 'unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}
