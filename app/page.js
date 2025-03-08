// app/page.js
// Définir explicitement le mode dynamique pour cette page
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

import React from 'react';
import { Suspense } from 'react';
import { lazy } from 'react';
import { getAllProducts } from '@/backend/utils/server-only-methods';
import Loading from './loading';

// Utilisation de lazy au lieu de dynamic pour éviter le conflit de nom
const ListProducts = lazy(() => import('@/components/products/ListProducts'));

export const metadata = {
  title: 'Buy It Now - Votre boutique en ligne',
  description:
    'Découvrez notre sélection de produits de qualité à des prix attractifs',
  openGraph: {
    title: 'Buy It Now - Votre boutique en ligne',
    description:
      'Découvrez notre sélection de produits de qualité à des prix attractifs',
    type: 'website',
  },
};

// eslint-disable-next-line react/prop-types
const HomePage = async ({ searchParams }) => {
  console.log('WE ARE IN THE GET PRODUCTS HOMEPAGE');
  // Récupération des données avec un fallback en cas d'erreur
  const productsData = await getAllProducts(searchParams).catch(() => ({
    products: [],
    categories: [],
    totalPages: 0,
  }));

  return (
    <Suspense fallback={<Loading />}>
      <main>
        <ListProducts data={productsData} />
      </main>
    </Suspense>
  );
};

export default HomePage;
