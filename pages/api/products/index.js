import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { getProducts } from '@/backend/controllers/productControllers';
import onError from '@/backend/middlewares/errors';
import { captureException, recordMetric } from '@/monitoring/sentry';

// Configuration avancée pour next-connect
const router = createRouter({
  onTimeout: (req, res) => {
    res.status(504).json({
      success: false,
      message: "La requête a pris trop de temps à s'exécuter",
    });
  },
  timeout: 15000, // 15 secondes pour les listes de produits
  onNoMatch: (req, res) => {
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  },
});

// Middleware pour le monitoring
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const queryParams = new URLSearchParams(req.query).toString();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    if (duration > 1000) {
      console.warn(`Requête lente: ${req.method} ${req.url} - ${duration}ms`);
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        recordMetric('api.products.list.duration', duration, {
          tags: {
            method: req.method,
            status: res.statusCode,
            query: queryParams.substring(0, 100),
          },
        });
      } catch (e) {
        // Ignorer les erreurs de métrique
      }
    }
  });

  next();
};

// Middleware pour la sécurité
const securityMiddleware = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains',
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// Middleware pour le cache
const cacheControl = (req, res, next) => {
  // Cache côté client pour GET - 1 minute, cache CDN - 5 minutes
  res.setHeader(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  );
  next();
};

// Middleware pour la connexion à la base de données
const connectDB = async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    captureException(error, {
      tags: { component: 'API', route: '/api/products', action: 'connectDB' },
    });
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion à la base de données',
    });
  }
};

// Ajouter les middlewares
router
  .use(monitoringMiddleware)
  .use(securityMiddleware)
  .use(cacheControl)
  .use(connectDB);

// Configurer la route GET
router.get(getProducts);

// Précharger la connexion à la DB
await dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
  captureException(err, {
    tags: {
      component: 'API',
      route: '/api/products',
      action: 'initialConnect',
    },
  });
});

export default router.handler({ onError });
