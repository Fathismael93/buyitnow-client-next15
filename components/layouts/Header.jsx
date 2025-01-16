'use client';

import React, { useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const Search = dynamic(() => import('./Search'));
import Image from 'next/image';
import CartContext from '@/context/CartContext';
import { useSession } from 'next-auth/react';
import AuthContext from '@/context/AuthContext';

const Header = () => {
  /* ***********  TESTING CODE  *********** */

  // const [user, setUser] = useState(null)
  // const [loading, setLoading] = useState(false)
  // const cartCount = 0

  /* ***********  REAL CODE   *********** */

  const { user, setLoading, setUser } = useContext(AuthContext);

  const { data } = useSession();

  useEffect(() => {
    if (data) {
      setUser(data?.user);
    }
  }, [data]);

  const { cartCount } = useContext(CartContext);

  return (
    <header className="bg-white py-2 border-b">
      <div className="container max-w-screen-xl mx-auto px-4">
        <div className="flex flex-wrap items-center">
          <div className="flex-shrink-0 mr-5">
            <Link href="/">
              <Image
                priority
                src="/images/logo.png"
                height={40}
                width={120}
                alt="BuyItNow"
                style={{ width: '100%', height: 'auto' }}
              />
            </Link>
          </div>
          <Search setLoading={setLoading} />

          <div className="flex items-center space-x-2 ml-auto">
            {user && (
              <Link
                href="/cart"
                className="px-3 py-2 inline-block text-center text-gray-700 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-blue-100 hover:border-gray-300"
              >
                <i className="text-gray-400 w-5 fa fa-shopping-cart"></i>
                <span className="hidden lg:inline ml-1">
                  Cart (
                  <b>
                    {cartCount !== undefined &&
                    cartCount !== null &&
                    cartCount > 0
                      ? cartCount
                      : 0}
                  </b>
                  )
                </span>
              </Link>
            )}
            {!user ? (
              <Link
                href="/login"
                className="px-3 py-2 inline-block text-center text-gray-700 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-blue-100 hover:border-gray-300"
              >
                <i className="text-gray-400 w-5 fa fa-user"></i>
                <span className="hidden lg:inline ml-1">Sign in</span>
              </Link>
            ) : (
              <Link href="/me">
                <div className="flex items-center mb-4 space-x-3 mt-4 cursor-pointer hover:bg-blue-100 hover:text-xs hover:rounded-md">
                  <img
                    className="w-10 h-10 rounded-full"
                    src={
                      user?.avatar ? user?.avatar?.url : '/images/default.png'
                    }
                  />
                  <div className="space-y-1 font-medium hidden md:block">
                    <p>
                      {user?.name}
                      <time className="block text-sm text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </time>
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
