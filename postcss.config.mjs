/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind CSS
    '@tailwindcss/postcss': {},

    // Autoprefixer pour la compatibilité navigateurs
    autoprefixer: {},

    // En production uniquement:
    ...(process.env.NODE_ENV === 'production'
      ? {
          // Optimisation des CSS
          cssnano: {
            preset: [
              'default',
              {
                discardComments: {
                  removeAll: true,
                },
                minifyFontValues: {
                  removeQuotes: false,
                },
                // Désactiver la réduction des calc() qui peut causer des bugs
                calc: false,
              },
            ],
          },

          // Supprimer les styles inutilisés
          '@fullhuman/postcss-purgecss': {
            content: [
              './pages/**/*.{js,jsx,ts,tsx}',
              './components/**/*.{js,jsx,ts,tsx}',
              './app/**/*.{js,jsx,ts,tsx}',
            ],
            defaultExtractor: (content) =>
              content.match(/[\w-/:]+(?<!:)/g) || [],
            safelist: {
              standard: ['html', 'body', /^react-/, /^next-/],
              deep: [/toast/, /lazy-load/],
            },
          },
        }
      : {}),
  },
};

export default config;
