import ErrorHandler from '../utils/errorHandler';
import { getServerSession } from 'next-auth';
import auth from '@/pages/api/auth/[...nextauth]';
import { captureException } from '@/monitoring/sentry';

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 * @returns {Promise<void>}
 */
const isAuthenticatedUser = async (req, res, next) => {
  try {
    const session = await getServerSession(req, res, auth);

    if (!session) {
      return next(
        new ErrorHandler(
          'Veuillez vous connecter pour accéder à cette ressource',
          401,
        ),
      );
    }

    // Vérifier si le token n'est pas expiré
    const currentTime = Date.now() / 1000;
    if (
      session.expires &&
      new Date(session.expires).getTime() / 1000 < currentTime
    ) {
      return next(
        new ErrorHandler('Session expirée. Veuillez vous reconnecter', 401),
      );
    }

    req.user = session.user;
    next();
  } catch (error) {
    captureException(error, {
      tags: { middleware: 'auth', action: 'authenticate' },
      extra: { path: req.url },
    });
    return next(new ErrorHandler("Erreur d'authentification", 500));
  }
};

/**
 * Middleware pour vérifier les rôles d'utilisateur
 * @param {...String} roles - Rôles autorisés
 * @returns {Function} - Middleware d'autorisation
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ErrorHandler(
          'Veuillez vous connecter pour accéder à cette ressource',
          401,
        ),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Rôle (${req.user.role}) non autorisé à accéder à cette ressource`,
          403,
        ),
      );
    }

    next();
  };
};

export { isAuthenticatedUser, authorizeRoles };
