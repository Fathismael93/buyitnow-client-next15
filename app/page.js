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

// Fonction pour générer les métadonnées dynamiquement
export async function generateMetadata({ searchParams }) {
  const keyword = searchParams.keyword || '';

  if (keyword) {
    return {
      title: `Résultats pour "${keyword}" - Buy It Now`,
      description: `Découvrez nos produits correspondant à "${keyword}"`,
    };
  }

  return metadata;
}

const HomePage = async ({ searchParams }) => {
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
