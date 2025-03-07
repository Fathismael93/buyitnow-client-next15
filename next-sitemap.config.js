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
  transform: async (url) => {
    // Custom transformation logic for individual pages
    // Return object if you want to modify a url
    // Skip returning an object if you want to keep the default configuration

    // Example: Set higher priority for product pages
    if (url.startsWith('/product/')) {
      return {
        loc: url,
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      };
    }

    // Example: Set higher priority for category pages
    if (url.startsWith('/category/')) {
      return {
        loc: url,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      };
    }

    // Use default transformation for all other urls
    return {
      loc: url,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
