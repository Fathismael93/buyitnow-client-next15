/** @type {import('next').NextConfig} */
import withBundleAnalyzer from '@next/bundle-analyzer';

// Analyser les bundles uniquement lorsque demandé
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Configuration des images distantes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '**',
      },
    ],
    // Optimisations d'images
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Cache et performance
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },

  // Optimisations expérimentales
  experimental: {
    // Optimiser les importations de packages
    optimizePackageImports: [
      'icon-library',
      'react-toastify',
      'countries-list',
    ],

    // Configuration de Turbo
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
      resolveAlias: {
        underscore: 'lodash',
        mocha: { browser: 'mocha/browser-entry.js' },
      },
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },

    // Nouvelles optimisations
    serverExternalPackages: ['mongoose'],
  },

  // Compression
  compress: true,

  // Mode standalone pour les déploiements optimisés
  output: 'standalone',

  // Optimisation des headers de sécurité
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],

  // Redirection de HTTP vers HTTPS en production
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/:path*',
            has: [
              {
                type: 'header',
                key: 'x-forwarded-proto',
                value: 'http',
              },
            ],
            permanent: true,
            destination: 'https://:host/:path*',
          },
        ]
      : [];
  },

  // Personnalisation de webpack pour optimiser les bundles
  webpack: (config, { dev }) => {
    // Optimisations en production uniquement
    if (!dev) {
      // Ignorer les fichiers de test pour réduire la taille des bundles en production
      config.module.rules.push({
        test: /\.(spec|test)\.(js|jsx|ts|tsx)$/,
        loader: 'ignore-loader',
      });
    }

    return config;
  },
};

export default bundleAnalyzer(nextConfig);

// Pour réactiver Sentry plus tard:
// import { withSentryConfig } from '@sentry/nextjs';
// export default withSentryConfig(
//   bundleAnalyzer(nextConfig),
//   {
//     org: 'benew',
//     project: 'buyitnow',
//     authToken: process.env.SENTRY_AUTH_TOKEN,
//     silent: false,
//   }
// );
