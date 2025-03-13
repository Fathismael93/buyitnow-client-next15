'use client';

import React, {
  useContext,
  useEffect,
  useState,
  memo,
  useCallback,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import CartContext from '@/context/CartContext';
import { DECREASE, INCREASE } from '@/helpers/constants';
import Loading from '@/app/loading';
import dynamic from 'next/dynamic';
import { captureException } from '@/monitoring/sentry';
import { formatPrice } from '@/helpers/helpers';

// Chargement dynamique du composant ItemCart
const ItemCart = dynamic(() => import('./components/ItemCart'), {
  loading: () => <CartItemSkeleton />,
  ssr: true,
});

// Composant squelette pour le chargement des articles du panier
const CartItemSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-wrap lg:flex-row gap-5 mb-4">
      <div className="w-full lg:w-2/5 xl:w-2/4">
        <div className="flex">
          <div className="block w-16 h-16 rounded-sm bg-gray-200"></div>
          <div className="ml-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
      <div className="w-24">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      <div className="flex-auto">
        <div className="float-right">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
    <hr className="my-4" />
  </div>
);

// Composant pour l'état vide du panier
const EmptyCart = memo(() => (
  <div className="py-12 flex flex-col items-center justify-center text-center px-4 transition-all duration-300 transform translate-y-0 opacity-100">
    <div className="bg-gray-100 rounded-full p-6 mb-6">
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
    <h2 className="text-2xl font-semibold mb-3 text-gray-800">
      Votre panier est vide
    </h2>
    <p className="text-gray-600 mb-6 max-w-md">
      Il semble que vous n'ayez pas encore ajouté d'articles à votre panier.
    </p>
    <Link
      href="/"
      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Découvrir nos produits
    </Link>
  </div>
));

const CartSummary = memo(({ cartItems, amount, onCheckout }) => {
  const totalUnits = cartItems.reduce((acc, item) => acc + item?.quantity, 0);

  return (
    <aside className="md:w-1/4">
      <div className="border border-gray-200 bg-white shadow rounded-lg mb-5 p-4 lg:p-6 sticky top-24 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
        <h3 className="font-semibold text-lg mb-4 pb-4 border-b border-gray-200">
          Récapitulatif
        </h3>
        <ul className="mb-5 space-y-3">
          <li
            className="flex justify-between text-gray-600"
            title="Nombre total d'articles"
          >
            <span>Nombre d'articles:</span>
            <span className="font-medium">{totalUnits}</span>
          </li>

          {totalUnits > 0 && (
            <li className="flex justify-between text-gray-600">
              <span>Prix unitaire moyen:</span>
              <span className="font-medium">
                {formatPrice(amount / totalUnits)}
              </span>
            </li>
          )}

          <li
            className="text-lg font-bold border-t flex justify-between mt-3 pt-4"
            title="Prix total"
          >
            <span>Total:</span>
            <span className="text-blue-600">{formatPrice(amount)}</span>
          </li>
        </ul>

        <div className="space-y-3">
          <button
            onClick={onCheckout}
            className="px-4 py-3 inline-block text-sm font-medium w-full text-center text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            title="Continuer vers la livraison"
          >
            Continuer vers la livraison
          </button>

          <Link
            href="/"
            title="Continuer mes achats"
            className="px-4 py-3 inline-block text-sm w-full text-center font-medium text-blue-600 bg-white shadow-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </aside>
  );
});

const Cart = () => {
  const {
    loading,
    updateCart,
    deleteItemFromCart,
    cart,
    cartCount,
    setLoading,
    saveOnCheckout,
    setCartToState,
    cartTotal,
  } = useContext(CartContext);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [itemBeingRemoved, setItemBeingRemoved] = useState(null);
  const router = useRouter();

  // Précharger la page de livraison
  useEffect(() => {
    router.prefetch('/shipping');
    router.prefetch('/shipping-choice');

    // Chargement initial du panier
    const loadCart = async () => {
      try {
        await setCartToState();
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        captureException(error, {
          tags: { component: 'Cart', action: 'initialLoad' },
        });
        toast.error('Impossible de charger votre panier. Veuillez réessayer.');
      } finally {
        setInitialLoadComplete(true);
      }
    };

    loadCart();
  }, [router, setCartToState]);

  // Fonction optimisée pour augmenter la quantité
  const increaseQty = useCallback(
    async (cartItem) => {
      try {
        setLoading(true);
        await updateCart(cartItem, INCREASE);
      } catch (error) {
        console.error("Erreur lors de l'augmentation de la quantité:", error);
        captureException(error, {
          tags: { component: 'Cart', action: 'increaseQty' },
          extra: { cartItem },
        });
      }
    },
    [updateCart, setLoading],
  );

  // Fonction optimisée pour diminuer la quantité
  const decreaseQty = useCallback(
    async (cartItem) => {
      try {
        setLoading(true);
        await updateCart(cartItem, DECREASE);
      } catch (error) {
        console.error('Erreur lors de la diminution de la quantité:', error);
        captureException(error, {
          tags: { component: 'Cart', action: 'decreaseQty' },
          extra: { cartItem },
        });
      }
    },
    [updateCart, setLoading],
  );

  // Fonction optimisée pour supprimer un article
  const handleDeleteItem = useCallback(
    async (itemId) => {
      try {
        setDeleteInProgress(true);
        setItemBeingRemoved(itemId);
        await deleteItemFromCart(itemId);
      } catch (error) {
        console.error("Erreur lors de la suppression d'un article:", error);
        captureException(error, {
          tags: { component: 'Cart', action: 'deleteItem' },
          extra: { itemId },
        });
      } finally {
        setDeleteInProgress(false);
        setItemBeingRemoved(null);
      }
    },
    [deleteItemFromCart],
  );

  // Préparation au paiement
  const checkoutHandler = useCallback(() => {
    const checkoutData = {
      amount: cartTotal.toFixed(2),
      tax: 0, // À ajuster selon les besoins
      totalAmount: cartTotal.toFixed(2),
    };

    saveOnCheckout(checkoutData);
    router.push('/shipping-choice');
  }, [cartTotal, saveOnCheckout, router]);

  // Afficher un écran de chargement pendant le chargement initial
  if (loading && !initialLoadComplete) {
    return <Loading />;
  }

  return (
    <>
      <section className="py-5 sm:py-7 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Mon Panier
            </h1>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {cartCount || 0} article{cartCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container max-w-6xl mx-auto px-4">
          {!loading && cart?.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <main className="md:w-3/4">
                <div className="bg-white shadow rounded-lg mb-5 p-4 lg:p-6 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
                  {loading && initialLoadComplete ? (
                    <>
                      {[...Array(3)].map((_, index) => (
                        <CartItemSkeleton key={index} />
                      ))}
                    </>
                  ) : (
                    <>
                      {cart?.map((cartItem) => (
                        <div
                          key={cartItem._id}
                          className={`transition-all duration-300 ease-in-out transform ${itemBeingRemoved === cartItem._id ? 'opacity-0 -translate-x-3 h-0 overflow-hidden' : 'opacity-100 translate-x-0'}`}
                        >
                          <ItemCart
                            cartItem={cartItem}
                            deleteItemFromCart={handleDeleteItem}
                            decreaseQty={decreaseQty}
                            increaseQty={increaseQty}
                            deleteInProgress={deleteInProgress}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </main>

              {cart?.length > 0 && (
                <CartSummary
                  cartItems={cart}
                  amount={cartTotal}
                  onCheckout={checkoutHandler}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Cart;
