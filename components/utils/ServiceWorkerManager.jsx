'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

/**
 * Gère l'intégration du Service Worker
 * Ce composant est conçu pour être inclus dans le layout principal
 */
const ServiceWorkerManager = () => {
  // Détection du mode développement ou production
  const isProduction = process.env.NODE_ENV === 'production';

  useEffect(() => {
    // Désactiver la mise en cache en développement
    if (!isProduction && 'serviceWorker' in navigator) {
      // Désinscrire tout Service Worker existant en mode développement
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log(
            'Service Worker désinscrit (environnement de développement)',
          );
        }
      });
    }
  }, [isProduction]);

  // N'intégrer le script que dans l'environnement de production
  if (!isProduction) {
    return null;
  }

  return (
    <>
      <Script id="sw-register" src="/sw-register.js" strategy="lazyOnload" />
    </>
  );
};

export default ServiceWorkerManager;
