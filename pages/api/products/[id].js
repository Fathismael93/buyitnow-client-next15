import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { getProduct } from '@/backend/controllers/productControllers';
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
  timeout: 10000, // 10 secondes
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
  const productId = req.query.id;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    if (process.env.NODE_ENV === 'production') {
      try {
        recordMetric('api.products.detail.duration', duration, {
          tags: {
            method: req.method,
            status: res.statusCode,
            id: productId,
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
  // Cache côté client pour GET - 5 minutes, cache CDN - 1 heure
  res.setHeader(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  );
  next();
};

// Validation de l'ID du produit
const validateProductId = (req, res, next) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID de produit manquant',
    });
  }

  // Vérifier format d'ID MongoDB valide
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Format d'ID de produit invalide",
    });
  }

  next();
};

// Middleware pour la connexion à la base de données
const connectDB = async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    captureException(error, {
      tags: {
        component: 'API',
        route: '/api/products/[id]',
        action: 'connectDB',
      },
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
  .use(validateProductId)
  .use(connectDB);

// Configurer la route GET
router.get(getProduct);

// Précharger la connexion à la DB
await dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
  captureException(err, {
    tags: {
      component: 'API',
      route: '/api/products/[id]',
      action: 'initialConnect',
    },
  });
});

export default router.handler({ onError });
