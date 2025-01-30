import React from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';

import { GlobalProvider } from './GlobalProvider';
dynamic(() => import('./globals.css'));
const Header = dynamic(() => import('@/components/layouts/Header'));
const Head = dynamic(() => import('@/app/head'));

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head />
      <body>
        <GlobalProvider>
          <Header />
          {children}
        </GlobalProvider>

        <Script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css" />
      </body>
    </html>
  );
}
