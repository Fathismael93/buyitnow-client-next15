import ErrorHandler from '../utils/errorHandler';
import { captureException } from '@/monitoring/sentry';

/**
 * Middleware de gestion centralisée des erreurs pour l'API
 * @param {Error} err - L'erreur rencontrée
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 * @returns {Object} - Réponse HTTP avec détails de l'erreur
 */
// eslint-disable-next-line import/no-anonymous-default-export
export default (err, req, res) => {
  let error = { ...err };

  // Conserver le message et la stack trace
  error.message = err.message || 'Erreur serveur interne';
  error.stack = err.stack;

  // Définir le code HTTP par défaut si non fourni
  error.statusCode = err.statusCode || 500;

  // Journaliser l'erreur en environnement de production
  if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
    captureException(err, {
      tags: {
        middleware: 'error_handler',
        status_code: error.statusCode,
      },
      extra: {
        path: req.url,
        method: req.method,
      },
    });
  }

  // Gestion des erreurs spécifiques à Mongoose

  // Erreurs de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((value) => value.message);
    error = new ErrorHandler(messages.join(', '), 400);
  }

  // Erreurs de clé dupliquée (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' est déjà utilisé`;
    error = new ErrorHandler(message, 400);
  }

  // Erreur d'ID invalid
  if (err.name === 'CastError') {
    const message = `Ressource non trouvée. ID invalide : ${err.value}`;
    error = new ErrorHandler(message, 404);
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorHandler(
      'Session invalide. Veuillez vous reconnecter',
      401,
    );
  }

  // Erreur d'expiration JWT
  if (err.name === 'TokenExpiredError') {
    error = new ErrorHandler('Session expirée. Veuillez vous reconnecter', 401);
  }

  // En mode développement, inclure la stack trace
  const devMode = process.env.NODE_ENV === 'development';

  // Formatter la réponse d'erreur
  const errorResponse = {
    success: false,
    message: error.message,
    statusCode: error.statusCode,
    ...(devMode && { stack: error.stack }),
    ...(devMode && err.errors && { validationErrors: err.errors }),
  };

  return res.status(error.statusCode).json(errorResponse);
};
