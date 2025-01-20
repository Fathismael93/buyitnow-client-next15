'use client';

import { arrayHasData } from '@/helpers/helpers';
import dynamic from 'next/dynamic';
import Loading from '@/app/loading';

import { Virtuoso } from 'react-virtuoso';
import React, { useContext, useEffect } from 'react';
import OrderContext from '@/context/OrderContext';

const OrderItem = dynamic(() => import('@/components/orders/OrderItem'), {
  loading: () => <Loading />,
});

const CustomPagination = dynamic(
  () => import('@/components/layouts/CustomPagination'),
);

const ListOrders = ({ orders }) => {
  const { setDeliveryPrice } = useContext(OrderContext);

  useEffect(() => {
    setDeliveryPrice(orders?.deliveryPrice[0]?.deliveryPrice);
  }, []);

  return (
    <>
      <h3 className="text-xl font-semibold mb-5">Your Latest Orders</h3>
      {arrayHasData(orders?.orders) ? (
        <p className="font-bold text-md">
          No Orders! You did not purchase anything
        </p>
      ) : (
        <>
          {/* WITH VIRTUALIZED COMPONENT */}

          {/* <Virtuoso
            className="!h-[1200px] sm:!h-[1000px] md:!h-[650px] lg:!h-[500px] "
            data={orders?.orders}
            itemContent={(_, order) => (
              <OrderItem key={order._id} order={order} />
            )}
          /> */}

          {/* WITHOUT VIRTUALIZED COMPONENT */}

          {orders?.orders?.map((order) => (
            <OrderItem key={order._id} order={order} />
          ))}

          <CustomPagination totalPages={orders?.totalPages} />
        </>
      )}
    </>
  );
};

export default ListOrders;
