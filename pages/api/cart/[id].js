import { createRouter } from 'next-connect';
import dbConnect from '@/backend/config/dbConnect';
import { isAuthenticatedUser } from '@/backend/middlewares/auth';
import onError from '@/backend/middlewares/errors';
import { deleteCart } from '@/backend/controllers/cartControllers';

// Configuration simplifiée pour next-connect
const router = createRouter();

// Se connecter à la base de données
dbConnect().catch((err) => {
  console.error('Erreur de connexion à la base de données:', err);
});

// Route avec authentification
router.use(isAuthenticatedUser).delete(deleteCart);

// Exporter le handler
export default router.handler({ onError });
