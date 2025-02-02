import React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const OrderedProduct = ({ item }) => {
  return (
    <figure className="flex flex-row mb-4">
      <div>
        <div className="block w-20 h-20 rounded-sm border border-gray-200 overflow-hidden p-3">
          <LazyLoadImage
            src={item?.image ? item?.image : '/images/default_product.png'}
            alt={item.name}
            title="Product Image"
            width="100%"
            effect="blur-sm"
            wrapperProps={{
              // If you need to, you can tweak the effect transition using the wrapper style.
              style: { transitionDelay: '1s' },
            }}
          />
        </div>
      </div>
      <figcaption className="ml-3">
        <p>{item.name.substring(0, 35)}</p>
        <p className="mt-1 font-semibold">
          {item.quantity}x = ${item.price * item.quantity}
        </p>
      </figcaption>
    </figure>
  );
};

export default OrderedProduct;