import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  async function middleware(req) {
    try {
      // Get the pathname from the URL
      const url = req.nextUrl.pathname;
      const user = req?.nextauth?.token?.user;

      // For API routes, add CORS headers but be more specific for security
      if (url.startsWith('/api')) {
        const response = NextResponse.next();

        // More restrictive CORS policy for production
        const allowedOrigins =
          process.env.NODE_ENV === 'production'
            ? [
                process.env.NEXT_PUBLIC_SITE_URL ||
                  'https://buyitnow-client-next15.vercel.app/',
              ]
            : ['http://localhost:3000'];

        const origin = req.headers.get('origin');

        if (origin && allowedOrigins.includes(origin)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
          response.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
          );
          response.headers.set(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization',
          );
          response.headers.set('Access-Control-Max-Age', '86400');
        }

        return response;
      }

      // Protect routes
      if (
        url?.startsWith('/me') ||
        url?.startsWith('/address') ||
        url?.startsWith('/cart') ||
        url?.startsWith('/shipping')
      ) {
        if (!user) {
          return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
      }

      // Allow authenticated requests to continue
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware error:', error);
      // Redirect to error page or homepage in case of unexpected errors
      return NextResponse.redirect(new URL('/error', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Return true if the token exists, false otherwise
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    '/me/:path*',
    '/address/:path*',
    '/cart',
    '/shipping',
    '/api/:path*',
  ],
};
