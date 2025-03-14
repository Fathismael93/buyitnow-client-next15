import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { isAuthenticatedUser } from '@/backend/middlewares/auth';
import onError from '@/backend/middlewares/errors';
import {
  getCart,
  newCart,
  updateCart,
} from '@/backend/controllers/cartControllers';

// Configuration simplifiée pour next-connect
const router = createRouter();

// Se connecter à la base de données au démarrage mais ne pas bloquer l'API
dbConnect().catch((err) => {
  console.error('Erreur initiale de connexion à la base de données:', err);
});

// Définir les routes avec authentification
router.use(isAuthenticatedUser).get(getCart);
router.use(isAuthenticatedUser).post(newCart);
router.use(isAuthenticatedUser).put(updateCart);

// Exporter le handler avec gestion d'erreurs
export default router.handler({ onError });
