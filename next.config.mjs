/** @type {import('next').NextConfig} */
// import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
  },
  experimental: {
    optimizePackageImports: ['icon-library'],
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
  output: 'standalone',
};

// // Make sure adding Sentry options is the last code to run before exporting
// export default withSentryConfig(nextConfig, {
//   org: 'benew',
//   project: 'buyitnow',

//   // An auth token is required for uploading source maps.
//   authToken: process.env.SENTRY_AUTH_TOKEN,

//   silent: false, // Can be used to suppress logs
// });

export default bundleAnalyzer(nextConfig);
