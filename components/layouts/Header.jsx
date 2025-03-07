'use client';

import React, { useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import CartContext from '@/context/CartContext';
import { useSession } from 'next-auth/react';
import AuthContext from '@/context/AuthContext';

const Search = dynamic(() => import('./Search'));

const Header = () => {
  const { user, setLoading, setUser } = useContext(AuthContext);
  const { setCartToState, cartCount } = useContext(CartContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data } = useSession();

  useEffect(() => {
    if (data) {
      setUser(data?.user);
      setCartToState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Fermer le menu mobile si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu && !mobileMenu.contains(event.target) && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="bg-white py-2 border-b sticky top-0 z-50 shadow-sm">
      <div className="container max-w-[1440px] mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between">
          {/* Logo */}
          <div className="shrink-0 mr-5">
            <Link href="/">
              <Image
                priority={true}
                src="/images/logo.png"
                height={40}
                width={120}
                alt="BuyItNow"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <Link
                href="/cart"
                className="px-3 py-2 inline-block text-center text-gray-700 bg-white shadow-sm border border-gray-200 rounded-md mr-2 relative"
                aria-label="Panier"
              >
                <i className="text-gray-400 w-5 fa fa-shopping-cart"></i>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-2 border border-gray-200 rounded-md text-gray-700"
              aria-label="Menu principal"
            >
              <i
                className={`fa ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}
              ></i>
            </button>
          </div>

          {/* Search - Desktop */}
          <div className="hidden md:block md:flex-1 max-w-xl mx-4">
            <Search setLoading={setLoading} />
          </div>

          {/* User navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {user && (
              <Link
                href="/cart"
                className="px-3 py-2 inline-block text-center text-gray-700 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors relative"
                aria-label="Panier"
              >
                <i className="text-gray-400 w-5 fa fa-shopping-cart"></i>
                <span className="ml-1">
                  Panier ({cartCount > 0 ? cartCount : 0})
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {!user ? (
              <Link
                href="/login"
                className="px-3 py-2 inline-block text-center text-gray-700 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                data-testid="login"
              >
                <i className="text-gray-400 w-5 fa fa-user"></i>
                <span className="ml-1">Connexion</span>
              </Link>
            ) : (
              <div className="relative group">
                <Link
                  href="/me"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                    <Image
                      data-testid="profile image"
                      alt="profile image"
                      src={
                        user?.avatar ? user?.avatar?.url : '/images/default.png'
                      }
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {user?.email}
                    </p>
                  </div>
                </Link>

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="py-1">
                    <Link
                      href="/me"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                    >
                      Mon profil
                    </Link>
                    <Link
                      href="/me/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                    >
                      Mes commandes
                    </Link>
                    <Link
                      href="/api/auth/signout"
                      className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Déconnexion
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden mt-4 border-t pt-4">
            <div className="mb-4">
              <Search setLoading={setLoading} />
            </div>
            {user ? (
              <div className="space-y-3">
                <Link
                  href="/me"
                  className="flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-blue-50"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                    <Image
                      alt="profile image"
                      src={
                        user?.avatar ? user?.avatar?.url : '/images/default.png'
                      }
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      {user?.email}
                    </p>
                  </div>
                </Link>
                <Link
                  href="/me/orders"
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md"
                >
                  Mes commandes
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="block px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  Déconnexion
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Connexion
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
