'use client';

import NextError from 'next/error';
import React, { useEffect } from 'react';

export default function GlobalError({ error }) {
  return (
    <html>
      <body>
        {/* This is the default Next.js error component. */}
        <NextError />
      </body>
    </html>
  );
}
