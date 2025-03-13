import React from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductDetails } from '@/backend/utils/server-only-methods';
import Loading from '@/app/loading';
import dynamic from 'next/dynamic';

// Imports dynamiques pour optimiser le chargement initial
const ProductDetails = dynamic(
  () => import('@/components/products/ProductDetails'),
  {
    loading: () => <Loading />,
    ssr: true, // Activer le SSR pour améliorer le SEO et les performances perçues
  },
);

// Générer les métadonnées dynamiquement pour un meilleur SEO
export async function generateMetadata({ params }) {
  try {
    // Récupérer les données du produit pour les métadonnées
    const data = await getProductDetails(params?.id);
    const product = data?.product;

    if (!product) {
      return {
        title: 'Produit non trouvé | Buy It Now',
        description: "Ce produit n'existe pas ou a été supprimé",
      };
    }

    // Catégorie pour le breadcrumb structuré
    const category = product.category?.categoryName || 'Produit';

    // Vérifier si l'image existe et récupérer son URL de manière sécurisée
    const imageUrl =
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0 &&
      product.images[0]?.url
        ? product.images[0].url
        : '/images/default_product.png';

    return {
      title: `${product.name} | Buy It Now`,
      description: product.description.substring(0, 160),
      openGraph: {
        title: product.name,
        description: product.description.substring(0, 160),
        // Corriger le type OpenGraph - 'product' n'est pas valide, utiliser 'website' à la place
        type: 'website',
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: product.name,
          },
        ],
      },
      // Ajouter des données structurées pour les moteurs de recherche
      other: {
        'product:price:amount': product.price,
        'product:price:currency': 'EUR',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Produit | Buy It Now',
      description: 'Détails du produit',
    };
  }
}

const ProductDetailsPage = async ({ params }) => {
  try {
    if (!params?.id) {
      return notFound();
    }

    // Récupérer les données produit
    const data = await getProductDetails(params.id);

    // Si aucune donnée n'est trouvée, renvoyer la page 404
    if (!data || !data.product) {
      return notFound();
    }

    return (
      <Suspense fallback={<Loading />}>
        <ProductDetails
          product={data.product}
          sameCategoryProducts={data.sameCategoryProducts}
          recommendedProducts={data.recommendedProducts}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return notFound();
  }
};

export default ProductDetailsPage;
