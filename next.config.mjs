/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [
      'icon-library',
      'react-toastify',
      'yup',
      'mongoose',
    ],
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
  },
  // Configuration de la compression
  compress: true,
  // Configuration du cache des pages statiques
  staticPageGenerationTimeout: 120,
  // Configuration de la sortie en standalone
  output: 'standalone',
  // Configuration des headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // Configuration de la redirection des erreurs 404
  async redirects() {
    return [
      {
        source: '/404',
        destination: '/',
        permanent: false,
      },
    ];
  },
  // Configuration du runtime
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  // Configuration des variables d'environnement côté client
  publicRuntimeConfig: {
    // Uniquement les variables publiques
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  },
  webpack: (config) => {
    // Optimisations webpack supplémentaires
    config.optimization.moduleIds = 'deterministic';
    return config;
  },
};

// Sentry integration
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG || 'benew',
  project: process.env.SENTRY_PROJECT || 'buyitnow',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: process.env.NODE_ENV === 'production',
  disableServerWebpackPlugin: false,
  disableClientWebpackPlugin: false,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  dryRun: process.env.NODE_ENV !== 'production',
};

// Export avec Sentry et l'analyseur de bundle
export default withSentryConfig(
  bundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions,
);
