/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://buyitnow-client-next15.vercel.app/',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/address', '/api', '/cart', '/me', '/shipping'],
      },
    ],
    additionalSitemaps: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://buyitnow-client-next15.vercel.app/'}/server-sitemap.xml`,
    ],
  },
  exclude: ['/address/*', '/api/*', '/cart', '/me/*', '/shipping'],
  outDir: 'public',
  transform: async (path) => {
    // Custom transformation logic for individual pages
    // Return object if you want to modify a path
    // Skip returning an object if you want to keep the default configuration

    // Example: Set higher priority for product pages
    if (path.startsWith('/product/')) {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      };
    }

    // Example: Set higher priority for category pages
    if (path.startsWith('/category/')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      };
    }

    // Use default transformation for all other paths
    return {
      loc: path,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
