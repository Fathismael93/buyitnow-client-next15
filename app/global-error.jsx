/* eslint-disable react/prop-types */
'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import React, { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Rapporter l'erreur à Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Erreur Critique
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {error?.message ||
                  "Une erreur critique s'est produite. Nos équipes ont été notifiées."}
              </p>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => reset()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Réessayer
                </button>
                <Link
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Retour à l&apos;accueil
                </Link>
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>Si le problème persiste, veuillez contacter notre support.</p>
              <p>ID d&apos;erreur: {error?.digest || 'unknown'}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
