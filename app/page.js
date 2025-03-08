import React from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getAllProducts } from '@/backend/utils/server-only-methods';
import Loading from './loading';

// Utilisation de dynamic import avec preload pour les composants critiques
const ListProducts = dynamic(
  () => import('@/components/products/ListProducts'),
  {
    loading: () => <Loading />,
    ssr: true,
  },
);

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
  // Pas besoin d'await ici, searchParams est déjà un objet
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
