import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { isAuthenticatedUser } from '@/backend/middlewares/auth';
import onError from '@/backend/middlewares/errors';
import { deleteCart } from '@/backend/controllers/cartControllers';
import { captureException } from '@/monitoring/sentry';

// Configuration avancée pour next-connect
const router = createRouter({
  // Gestion des timeouts
  onTimeout: (req, res) => {
    res.status(504).json({
      success: false,
      message: "La requête a pris trop de temps à s'exécuter",
    });
  },
  timeout: 10000, // 10 secondes

  // Vérification des méthodes HTTP
  onNoMatch: (req, res) => {
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  },
});

// Middleware pour connecter à la base de données
const connectDB = async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    captureException(error, {
      tags: { component: 'API', route: '/api/cart/[id]', action: 'connectDB' },
    });
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion à la base de données',
    });
  }
};

// Middleware pour le monitoring des API
const monitoringMiddleware = (req, res, next) => {
  // Enregistrer l'horodatage
  const startTime = Date.now();
  const itemId = req.query.id;

  // Surveiller les performances
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Capturer les métriques pour le monitoring
    if (
      typeof process.env.NODE_ENV !== 'undefined' &&
      process.env.NODE_ENV === 'production'
    ) {
      try {
        const { recordMetric } = require('@/monitoring/sentry');
        recordMetric('api.cart.item.duration', duration, {
          tags: {
            method: req.method,
            status: res.statusCode,
            id: itemId,
          },
        });
      } catch (e) {
        // Ignorer les erreurs de métrique
      }
    }
  });

  next();
};

// Validation avancée des paramètres
const validateParams = (req, res, next) => {
  const { id } = req.query;

  // Vérifier que l'ID est présent
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID de l'article manquant dans la requête",
    });
  }

  // Vérifier que l'ID est un ObjectID MongoDB valide (24 caractères hex)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Format d'ID invalide",
    });
  }

  next();
};

// Middleware pour la sécurité
const securityMiddleware = (req, res, next) => {
  // Ajout d'en-têtes de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains',
  );

  // Protection contre les attaques CSRF pour les opérations destructives
  if (req.method === 'DELETE') {
    const referer = req.headers.referer || '';
    const host = req.headers.host || '';

    // Vérifier que la requête vient bien du même site
    // Version simplifiée - en production, utilisez un token CSRF
    if (referer && !referer.includes(host)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cross-site request rejected',
      });
    }
  }

  next();
};

// Protection contre les abus et rate limiting
const rateLimiting = (req, res, next) => {
  // Version simplifiée - en production, utilisez une solution plus robuste
  // comme Redis pour stocker les compteurs de requêtes

  const clientIp =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // On pourrait implémenter un vrai rate limiting ici avec Redis
  // Pour l'instant, simple header pour le monitoring
  res.setHeader('X-RateLimit-IP', clientIp);

  next();
};

// Utilisation des middlewares dans l'ordre logique
router
  .use(monitoringMiddleware)
  .use(connectDB)
  .use(validateParams)
  .use(securityMiddleware)
  .use(rateLimiting)
  .use(isAuthenticatedUser);

// Handler de suppression optimisé
router.delete(async (req, res, next) => {
  try {
    // Vérification de sécurité supplémentaire
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
      });
    }

    // Poursuivre avec le controller standard
    await deleteCart(req, res, next);
  } catch (error) {
    captureException(error, {
      tags: { component: 'API', route: '/api/cart/[id]', action: 'delete' },
      extra: { id: req.query.id, user: req.user?.email },
    });

    // Ne pas exposer les détails de l'erreur en production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la suppression',
      });
    }

    next(error);
  }
});

// Préchargement de la connexion DB
await dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
  captureException(err, {
    tags: {
      component: 'API',
      route: '/api/cart/[id]',
      action: 'initialConnect',
    },
  });
});

// Exporter le handler
export default router.handler({ onError });
