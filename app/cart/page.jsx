import React from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loading from '@/app/loading';

// Import dynamique du composant Cart pour une meilleure performance
const Cart = dynamic(() => import('@/components/cart/Cart'), {
  loading: () => <Loading />,
  ssr: true,
});

export const metadata = {
  title: 'Buy It Now - Votre Panier',
  description: 'Gérez les articles dans votre panier et procédez au paiement',
  openGraph: {
    title: 'Buy It Now - Votre Panier',
    description: 'Gérez les articles dans votre panier et procédez au paiement',
    type: 'website',
  },
};

const CartPage = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Cart />
    </Suspense>
  );
};

export default CartPage;
