import React from 'react';

// Skeleton pour le chargement du panier complet
export const CartPageSkeleton = () => {
  return (
    <>
      {/* Header skeleton */}
      <section className="py-5 sm:py-7 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-md w-32 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <section className="py-8 md:py-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6">
            <main className="md:w-3/4">
              <div className="bg-white shadow rounded-lg mb-5 p-4 lg:p-6">
                {[...Array(3)].map((_, index) => (
                  <CartItemSkeleton key={index} />
                ))}
              </div>
            </main>

            <aside className="md:w-1/4">
              <div className="bg-white shadow rounded-lg mb-5 p-4 lg:p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-full mb-4 mt-3" />
                <div className="h-10 bg-gray-200 rounded w-full mb-3" />
                <div className="h-10 bg-gray-200 rounded w-full" />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};

// Skeleton pour un élément du panier
export const CartItemSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
      <div className="w-full sm:w-2/5 flex">
        <div className="h-24 w-24 bg-gray-200 rounded flex-shrink-0" />
        <div className="ml-4 flex flex-col">
          <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>

      <div className="flex items-center">
        <div className="h-10 w-24 bg-gray-200 rounded" />
      </div>

      <div className="flex flex-col items-start sm:items-end ml-auto">
        <div className="h-5 bg-gray-200 rounded w-20 mb-1" />
        <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </div>
    <div className="border-t border-gray-100 my-2" />
  </div>
);

// Skeleton pour le panier vide
export const EmptyCartSkeleton = () => (
  <div className="py-12 flex flex-col items-center justify-center animate-pulse">
    <div className="h-24 w-24 bg-gray-200 rounded-full mb-6" />
    <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
    <div className="h-4 bg-gray-200 rounded w-64 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-56 mb-6" />
    <div className="h-10 bg-gray-200 rounded w-40" />
  </div>
);

export default CartPageSkeleton;
