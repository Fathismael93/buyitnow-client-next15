/* eslint-disable react/prop-types */
'use client';

import { useContext, useEffect } from 'react';
import AuthContext, { AuthProvider } from '@/context/AuthContext';
import CartContext, { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { SessionProvider, useSession } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ErrorBoundary } from 'react-error-boundary';

// Fallback component for error boundary
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-center text-red-600">
          Quelque chose s&apos;est mal passé
        </h2>
        <p className="text-gray-700 text-center">
          {error.message || 'Une erreur inattendue est survenue'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
};

export function GlobalProvider({ children }) {
  // const { data: session, status } = useSession();
  // const { clearUser, setUser } = useContext(AuthContext);
  // const { clearCart } = useContext(CartContext);

  // useEffect(() => {
  //   if (status === 'authenticated' && session?.user) {
  //     setUser(session.user);
  //   } else if (status === 'unauthenticated') {
  //     clearUser();
  //     clearCart();
  //   }
  // }, [status, session]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            <SessionProvider>{children}</SessionProvider>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
