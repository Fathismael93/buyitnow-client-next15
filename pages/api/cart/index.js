import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { isAuthenticatedUser } from '@/backend/middlewares/auth';
import onError from '@/backend/middlewares/errors';
import {
  getCart,
  newCart,
  updateCart,
  clearCart,
} from '@/backend/controllers/cartControllers';
import { captureException } from '@/monitoring/sentry';

console.log('nOUS DANS LE FICHIER API/CART index.js');

// Configuration avancée pour next-connect
const router = createRouter({
  // Augmenter les timeouts pour les requêtes lourdes
  onTimeout: (_req, res) => {
    res.status(504).json({
      success: false,
      message: "La requête a pris trop de temps à s'exécuter",
    });
  },
  timeout: 10000, // 10 secondes

  // Vérification plus robuste des méthodes HTTP
  onNoMatch: (_req, res) => {
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  },
});

console.log('Le router est créé');

// Middleware pour connecter à la base de données
const connectDB = async (_req, res, next) => {
  try {
    await dbConnect();
    console.log('Base de données connectées');
    next();
  } catch (error) {
    captureException(error, {
      tags: { component: 'API', route: '/api/cart', action: 'connectDB' },
    });
    console.log('Base de données non connectées');
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion à la base de données',
    });
  }
};

// Middleware pour enregistrer les requêtes (monitoring)
const logRequests = (req, res, next) => {
  console.log('Nous sommes dans ce middleware logRequests');
  // Log uniquement en développement ou configurez pour production si nécessaire
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  // Ajouter des en-têtes de performance pour le monitoring
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Enregistrer les requêtes lentes
    if (duration > 1000) {
      console.warn(`Requête lente: ${req.method} ${req.url} - ${duration}ms`);
    }
  });

  console.log('Nous quittons le middleware logRequests');

  next();
};

// Middleware pour la sécurité et la validation
const securityMiddleware = (req, res, next) => {
  console.log('Nous sommes dans ce middleware securityMiddleware');
  // Ajout d'en-têtes de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains',
  );

  // Configurer CORS si nécessaire
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Validation des requêtes POST/PUT
  if (['POST', 'PUT'].includes(req.method)) {
    try {
      // Vérifier que le body est un JSON valide si présent
      if (req.body && typeof req.body === 'string' && req.body.trim() !== '') {
        JSON.parse(req.body);
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'JSON invalide dans le corps de la requête',
      });
    }
  }

  console.log('Nous quittons le middleware securityMiddleware');

  next();
};

// Cache pour améliorer les performances
const cacheControl = (req, res, next) => {
  console.log('Nous sommes dans ce middleware cacheControl');
  // Ne pas mettre en cache les routes sensibles
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // Cache côté client pour GET pendant 30 secondes pour éviter les requêtes fréquentes
    // Mais permettre la revalidation pour des données fraîches
    res.setHeader(
      'Cache-Control',
      'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
    );
  }

  console.log('Nous quittons le middleware cacheControl');

  next();
};

// Définir les routes avec middlewares optimisés
router
  .use(logRequests)
  .use(connectDB)
  .use(securityMiddleware)
  .use(cacheControl)
  .use(isAuthenticatedUser);

// Définir les handlers pour chaque méthode
router.get(getCart);
router.post(newCart);
router.put(updateCart);
router.delete(clearCart); // Ajout de la route pour vider le panier

// Optimisation: précharger la connexion à la DB mais ne pas bloquer le démarrage de l'API
dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
  captureException(err, {
    tags: { component: 'API', route: '/api/cart', action: 'initialConnect' },
  });
});

// Exporter le handler avec gestion d'erreurs
export default router.handler({ onError });
