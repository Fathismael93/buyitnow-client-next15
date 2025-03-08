/* eslint-disable react/prop-types */
import React from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { GlobalProvider } from './GlobalProvider';
import './globals.css';
import Loading from './loading';
import Link from 'next/link';

// Import dynamique des composants avec loading fallback
const Header = dynamic(() => import('@/components/layouts/Header'), {
  loading: () => <Loading />,
  ssr: true,
});

// Import dynamique du gestionnaire de Service Worker
const ServiceWorkerManager = dynamic(
  () => import('@/components/utils/ServiceWorkerManager'),
);

// Métadonnées globales pour le site
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      'https://buyitnow-client-next15.vercel.app',
  ),
  title: {
    default: 'Buy It Now',
    template: '%s | Buy It Now',
  },
  description:
    'Plateforme e-commerce avec une large sélection de produits de qualité',
  keywords: ['e-commerce', 'shopping', 'online store', 'products'],
  authors: [{ name: 'Buy It Now Team' }],
  creator: 'Buy It Now',
  publisher: 'Buy It Now',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url:
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://buyitnow-client-next15.vercel.app',
    title: 'Buy It Now',
    description:
      'Plateforme e-commerce avec une large sélection de produits de qualité',
    siteName: 'Buy It Now',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy It Now',
    description:
      'Plateforme e-commerce avec une large sélection de produits de qualité',
    creator: '@buyitnow',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    title: 'Buy It Now',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        {/* Preloading critical assets */}
        <link rel="preconnect" href="https://res.cloudinary.com" />

        {/* Font Awesome CDN pour les icônes, chargé de manière optimisée */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="flex flex-col min-h-screen bg-gray-50">
        <GlobalProvider>
          <ServiceWorkerManager />
          <Suspense fallback={<Loading />}>
            <Header />
          </Suspense>
          <main className="flex-grow">{children}</main>
          <footer className="bg-gray-800 text-white py-6 mt-auto">
            <div className="container max-w-[1440px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">Buy It Now</h3>
                  <p className="text-gray-300 text-sm">
                    Votre destination pour le shopping en ligne de qualité.
                    Découvrez notre vaste sélection de produits à des prix
                    compétitifs.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Liens utiles</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link
                        href="/"
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Accueil
                      </Link>
                    </li>
                    <li>
                      <a
                        href="/me"
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Mon compte
                      </a>
                    </li>
                    <li>
                      <a
                        href="/cart"
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Panier
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Nous contacter</h3>
                  <address className="text-gray-300 text-sm not-italic">
                    <p>Email: contact@buyitnow.com</p>
                    <p>Téléphone: +33 1 23 45 67 89</p>
                  </address>
                </div>
              </div>
              <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
                <p>
                  © {new Date().getFullYear()} Buy It Now. Tous droits
                  réservés.
                </p>
              </div>
            </div>
          </footer>
        </GlobalProvider>
      </body>
    </html>
  );
}
