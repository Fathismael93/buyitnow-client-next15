/* eslint-disable react/prop-types */
import React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const ItemShipping = ({ item }) => {
  return (
    <figure className="flex items-center mb-4 leading-5">
      <div>
        <div className="block relative w-20 h-20 rounded-sm p-1 border border-gray-200">
          <LazyLoadImage
            src={
              item?.product?.images[0]?.url
                ? item?.product?.images[0]?.url
                : '/images/default_product.png'
            }
            alt="Title"
            title="Product Image"
            width="50"
            height="50"
            effect="blur-sm"
            wrapperProps={{
              // If you need to, you can tweak the effect transition using the wrapper style.
              style: { transitionDelay: '1s' },
            }}
          />
          <span className="absolute -top-0.5 -right-2 w-4 h-4 text-sm text-center flex items-center justify-center text-white bg-blue-500 rounded-full">
            {item.quantity}
          </span>
        </div>
      </div>
      <figcaption className="ml-3">
        <p>{item?.product?.name?.substring(0, 50)}</p>
        <p className="mt-1 text-gray-400">
          Total: ${(item?.quantity * item?.product?.price).toFixed(2)}
        </p>
      </figcaption>
    </figure>
  );
};

export default ItemShipping;
