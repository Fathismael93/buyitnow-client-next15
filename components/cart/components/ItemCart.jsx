import React from 'react';
import Link from 'next/link';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const ItemCart = ({
  cartItem,
  deleteItemFromCart,
  decreaseQty,
  increaseQty,
}) => {
  return (
    <div>
      <div className="flex flex-wrap lg:flex-row gap-5  mb-4">
        <div className="w-full lg:w-2/5 xl:w-2/4">
          <figure className="flex leading-5">
            <div>
              <div className="block w-16 h-16 rounded border border-gray-200 overflow-hidden">
                <LazyLoadImage
                  src={
                    cartItem?.product?.images[0]?.url
                      ? cartItem?.product?.images[0]?.url
                      : '/images/default_product.png'
                  }
                  alt={cartItem?.product?.name}
                  title="Product Image"
                  width="100%"
                  effect="blur"
                  wrapperProps={{
                    // If you need to, you can tweak the effect transition using the wrapper style.
                    style: { transitionDelay: '1s' },
                  }}
                />
              </div>
            </div>
            <figcaption className="ml-3">
              <p>
                <Link
                  href={`/product/${cartItem?.product?._id}`}
                  className="hover:text-blue-600 font-semibold"
                >
                  {cartItem?.product?.name}
                </Link>
              </p>
              <p className="mt-1 text-gray-400">
                {' '}
                Stock: {cartItem?.product?.stock} items
              </p>
            </figcaption>
          </figure>
        </div>
        <div className="w-24">
          <div className="flex flex-row h-10 w-full rounded-lg relative bg-transparent mt-1">
            <button
              data-action="decrement"
              className=" bg-gray-300 text-gray-600 hover:text-gray-700 hover:bg-gray-400 h-full w-20 rounded-l cursor-pointer outline-none"
              onClick={() => decreaseQty(cartItem)}
            >
              <span className="m-auto text-2xl font-thin">−</span>
            </button>
            <input
              type="number"
              className="outline-none focus:outline-none text-center w-full bg-gray-300 font-semibold text-md hover:text-black focus:text-black  md:text-basecursor-default flex items-center text-gray-900  outline-none custom-input-number"
              name="custom-input-number"
              value={cartItem?.quantity}
              readOnly
            ></input>
            <button
              data-action="increment"
              className="bg-gray-300 text-gray-600 hover:text-gray-700 hover:bg-gray-400 h-full w-20 rounded-r cursor-pointer"
              onClick={() => increaseQty(cartItem)}
            >
              <span className="m-auto text-2xl font-thin">+</span>
            </button>
          </div>
        </div>
        <div>
          <div className="leading-5">
            <p className="font-semibold not-italic">
              ${(cartItem?.product?.price * cartItem?.quantity).toFixed(2)}
            </p>
            <small className="text-gray-400">
              {' '}
              ${cartItem?.product?.price} / per item{' '}
            </small>
          </div>
        </div>
        <div className="flex-auto">
          <div className="float-right">
            <a
              className="px-4 py-2 inline-block text-red-600 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer"
              onClick={() => deleteItemFromCart(cartItem._id)}
            >
              Remove
            </a>
          </div>
        </div>
      </div>

      <hr className="my-4" />
    </div>
  );
};

export default ItemCart;