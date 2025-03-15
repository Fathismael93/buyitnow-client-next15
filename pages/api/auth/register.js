import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { registerUser } from '@/backend/controllers/authControllers';
import onError from '@/backend/middlewares/errors';
import { captureException } from '@/monitoring/sentry';

// Configuration avancée pour next-connect avec timeouts et gestion des méthodes
const router = createRouter({
  onTimeout: (req, res) => {
    captureException(new Error('Register API timeout'), {
      tags: {
        component: 'API',
        route: '/api/auth/register',
        action: 'timeout',
      },
      extra: {
        email: req.body?.email
          ? `${req.body.email.substring(0, 3)}...`
          : 'unknown',
      },
    });

    res.status(504).json({
      success: false,
      message: "La requête d'inscription a expiré. Veuillez réessayer.",
    });
  },
  timeout: 15000, // 15 secondes pour l'inscription (inclut le hashage de mot de passe)

  onNoMatch: (req, res) => {
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée pour l'inscription`,
    });
  },
});

// Limites de taux pour prévenir les abus
const rateLimits = {
  windowMs: 60 * 60 * 1000, // 1 heure
  maxRequestsPerIP: 5, // Max 5 inscriptions par heure par IP
  store: new Map(), // En production, utiliser Redis
};

// Middleware de limitation de taux
const rateLimiter = (req, res, next) => {
  const clientIp =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const now = Date.now();
  const key = `register_${clientIp}`;

  // Nettoyer les anciennes entrées
  for (const [storedKey, data] of rateLimits.store.entries()) {
    if (now - data.timestamp > rateLimits.windowMs) {
      rateLimits.store.delete(storedKey);
    }
  }

  // Vérifier l'IP
  if (!rateLimits.store.has(key)) {
    rateLimits.store.set(key, {
      count: 1,
      timestamp: now,
    });
  } else {
    const data = rateLimits.store.get(key);

    // Réinitialiser si en dehors de la fenêtre
    if (now - data.timestamp > rateLimits.windowMs) {
      rateLimits.store.set(key, {
        count: 1,
        timestamp: now,
      });
    } else {
      // Incrémenter et vérifier
      data.count += 1;
      rateLimits.store.set(key, data);

      if (data.count > rateLimits.maxRequestsPerIP) {
        return res.status(429).json({
          success: false,
          message:
            "Trop de tentatives d'inscription. Veuillez réessayer plus tard.",
        });
      }
    }
  }

  next();
};

// Middleware de connexion à la base de données avec gestion d'erreur
const connectDB = async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    captureException(error, {
      tags: {
        component: 'API',
        route: '/api/auth/register',
        action: 'connectDB',
      },
    });
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion à la base de données',
    });
  }
};

// Middleware pour le monitoring et les métriques
const monitoringMiddleware = (req, res, next) => {
  // Enregistrer le temps de début
  const startTime = Date.now();

  // Mesurer le temps de réponse
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Enregistrer les métriques en production
    if (process.env.NODE_ENV === 'production') {
      try {
        const { recordMetric } = require('@/monitoring/sentry');
        recordMetric('api.register.duration', duration, {
          tags: {
            status: res.statusCode,
            success: res.statusCode < 400,
          },
        });
      } catch (error) {
        // Ignorer les erreurs de métrique
      }
    }
  });

  next();
};

// Middleware pour la sécurité
const securityMiddleware = (req, res, next) => {
  // En-têtes de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Configuration CORS spécifique pour l'inscription
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Ne pas mettre en cache les réponses d'inscription
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
};

// Validation des données d'inscription
const validateRegistrationData = (req, res, next) => {
  const { name, email, phone, password } = req.body || {};

  // Vérifier que toutes les données requises sont présentes
  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      success: false,
      message:
        'Tous les champs sont requis: nom, email, téléphone et mot de passe',
    });
  }

  // Validation de base de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format d'email invalide",
    });
  }

  // Validation du numéro de téléphone
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Format de numéro de téléphone invalide',
    });
  }

  // Validation du mot de passe
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Le mot de passe doit contenir au moins 6 caractères',
    });
  }

  // Vérification des limites de taille pour prévenir les attaques DOS
  if (
    name.length > 100 ||
    email.length > 254 ||
    phone.length > 20 ||
    password.length > 128
  ) {
    return res.status(400).json({
      success: false,
      message: 'Certaines valeurs dépassent les limites autorisées',
    });
  }

  // Sanitisation basique des données
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.phone = phone.trim().replace(/\s/g, '');

  next();
};

// Appliquer les middlewares dans l'ordre optimal
router
  .use(monitoringMiddleware)
  .use(securityMiddleware)
  .use(rateLimiter)
  .use(connectDB)
  .use(validateRegistrationData);

// Router pour POST uniquement (inscription)
router.post(async (req, res, next) => {
  try {
    await registerUser(req, res, next);
  } catch (error) {
    // Éviter les détails d'erreur en production pour les utilisateurs
    if (process.env.NODE_ENV === 'production') {
      captureException(error, {
        tags: {
          component: 'API',
          route: '/api/auth/register',
          action: 'register',
        },
        extra: {
          name: req.body?.name,
          email: req.body?.email
            ? `${req.body.email.substring(0, 3)}...`
            : 'unknown',
        },
      });

      // Message générique
      return res.status(500).json({
        success: false,
        message:
          "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
      });
    }

    // En développement, propager l'erreur pour plus de détails
    next(error);
  }
});

// Optimisation: précharger la connexion à la DB mais sans bloquer le démarrage
await dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
  captureException(err, {
    tags: {
      component: 'API',
      route: '/api/auth/register',
      action: 'initialConnect',
    },
  });
});

// Exporter le handler avec gestion d'erreurs centralisée
export default router.handler({ onError });
