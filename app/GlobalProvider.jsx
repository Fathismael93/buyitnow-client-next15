'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ErrorBoundary } from 'react-error-boundary';

// Fallback component for error boundary
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-center text-red-600">
          Quelque chose s'est mal passé
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
