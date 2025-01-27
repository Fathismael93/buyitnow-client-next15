'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Virtuoso } from 'react-virtuoso';
import Loading from '@/app/loading';

const CustomPagination = dynamic(
  () => import('@/components/layouts/CustomPagination'),
);

import Filters from '../layouts/Filters';
import ProductItem from './ProductItem';

// const Filters = dynamic(() => import('../layouts/Filters'), {
//   loading: () => <Loading />,
// });
// const ProductItem = dynamic(() => import('./ProductItem'), {
//   loading: () => <Loading />,
// });

import { arrayHasData } from '@/helpers/helpers';
import { useContext, useEffect } from 'react';
import AuthContext from '@/context/AuthContext';

const ListProducts = ({ data }) => {
  const { loading, setLoading } = useContext(AuthContext);

  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [data]);

  return (
    <section className="py-12">
      <div className="container max-w-screen-xl mx-auto px-4">
        <div className="flex flex-col md:flex-row -mx-4">
          <Filters categories={data?.categories} setLoading={setLoading} />

          {loading ? (
            <div className="w-full justify-center items-center">
              <Loading />
            </div>
          ) : arrayHasData(data?.products) ? (
            <div className="w-full">
              <p className="font-bold text-xl text-center">
                No products found!
              </p>
            </div>
          ) : (
            <main className="md:w-2/3 lg:w-3/4 px-3">
              {/* WITH VIRTUALIZED COMPONENT */}

              {/* <Virtuoso
                className="!h-[1440px] md:!h-[420px] lg:!h-[415px] xl:!h-[510px]"
                data={data?.products}
                itemContent={(_, product) => <ProductItem product={product} />}
              /> */}

              {/* WITHOUT VIRTUALIZED COMPONENT */}

              {data?.products?.map((product) => (
                <ProductItem key={product?._id} product={product} />
              ))}

              <CustomPagination totalPages={data?.totalPages} />
            </main>
          )}
        </div>
      </div>
    </section>
  );
};

export default ListProducts;
