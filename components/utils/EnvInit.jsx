'use client';

import { useEffect } from 'react';

/**
 * Expose les variables d'environnement côté client
 * Ce composant est conçu pour être inclus dans le layout principal
 */
const EnvInit = () => {
  useEffect(() => {
    // Exposer les variables d'environnement nécessaires au client
    window.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
    window.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
    window.NEXT_PUBLIC_ENABLE_SW = process.env.NEXT_PUBLIC_ENABLE_SW || 'false';
    window.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    window.NEXT_PUBLIC_CLOUDINARY_API_KEY =
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '';

    // Exposer NODE_ENV pour le service worker
    window.NEXT_PUBLIC_NODE_ENV = process.env.NODE_ENV || 'development';
  }, []);

  return null;
};

export default EnvInit;
