'use client';

import React, { useContext } from 'react';
import OrderContext from '@/context/OrderContext';
import { arrayHasData } from '@/helpers/helpers';
import Link from 'next/link';

const ErrorPage = () => {
  const { lowStockProducts } = useContext(OrderContext);

  return (
    <>
      <section className="py-5 sm:py-7 bg-blue-100">
        <div className="container max-w-(--breakpoint-xl) mx-auto px-4">
          <h2 className="text-xl font-semibold mb-2">
            Le stock des produits ci-dessous est inférieur à votre demande.
            Retournez dans votre panier et relancez l'achat en vérifiant que
            votre demande est bien égale au stock disponible.
          </h2>
        </div>
      </section>

      {!arrayHasData(lowStockProducts) && (
        <section className="py-10">
          <div className="container max-w-(--breakpoint-xl) mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4">
              <main className="md:w-3/4">
                <article className="border border-gray-200 bg-white shadow-xs rounded-sm mb-5 p-3 lg:p-5">
                  {lowStockProducts?.map((product) => (
                    <div key={product?.id}>
                      <div className="flex flex-wrap lg:flex-row gap-5  mb-4">
                        <div className="w-full lg:w-2/5 xl:w-2/4">
                          <figure className="flex leading-5">
                            <div>
                              <div className="block w-16 h-16 rounded-sm border border-gray-200 overflow-hidden">
                                <img
                                  src={
                                    product?.image
                                      ? product?.image
                                      : '/images/default_product.png'
                                  }
                                  alt={product?.name}
                                />
                              </div>
                            </div>
                            <figcaption className="ml-3">
                              <p>
                                <a href="#" className="hover:text-blue-600">
                                  {product?.name}
                                </a>
                              </p>
                            </figcaption>
                          </figure>
                        </div>
                        <div>
                          <div className="leading-5">
                            <p className="font-semibold not-italic">Stock</p>
                            <small className="text-green-400">
                              {' '}
                              {product?.stock} items
                            </small>
                          </div>
                        </div>
                        <div>
                          <div className="leading-5">
                            <p className="font-semibold not-italic">Demande</p>
                            <small className="text-red-400">
                              {' '}
                              {product?.quantity} items
                            </small>
                          </div>
                        </div>
                      </div>

                      <hr className="my-4" />
                    </div>
                  ))}
                  <div className="flex justify-end space-x-2 mt-10">
                    <Link
                      className="px-5 py-2 inline-block text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 cursor-pointer"
                      href="/cart"
                    >
                      Retour au panier
                    </Link>
                  </div>
                </article>
              </main>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default ErrorPage;