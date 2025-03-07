/**
 * Classe pour gérer les erreurs de l'application de manière standardisée
 * Étend la classe Error native et ajoute des propriétés supplémentaires
 */
class ErrorHandler extends Error {
  /**
   * Crée une nouvelle instance d'ErrorHandler
   * @param {string} message - Message d'erreur
   * @param {number} statusCode - Code HTTP
   * @param {Object} [details=null] - Détails supplémentaires sur l'erreur
   */
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;

    // Capturer la stack trace pour le débogage
    Error.captureStackTrace(this, this.constructor);

    // Ajouter des propriétés pour faciliter le traitement côté client
    this.isOperational = true; // Indique si l'erreur est opérationnelle (vs. programmation)
    this.timestamp = new Date().toISOString();
  }

  /**
   * Crée une erreur 404 "Non trouvé"
   * @param {string} [resource="Ressource"] - Nom de la ressource non trouvée
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 404
   */
  static notFound(resource = 'Ressource') {
    return new ErrorHandler(`${resource} non trouvé(e)`, 404);
  }

  /**
   * Crée une erreur 400 "Requête invalide"
   * @param {string} [message="Requête invalide"] - Message d'erreur
   * @param {Object} [details=null] - Détails supplémentaires sur l'erreur
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 400
   */
  static badRequest(message = 'Requête invalide', details = null) {
    return new ErrorHandler(message, 400, details);
  }

  /**
   * Crée une erreur 401 "Non autorisé"
   * @param {string} [message="Non autorisé"] - Message d'erreur
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 401
   */
  static unauthorized(message = 'Non autorisé') {
    return new ErrorHandler(message, 401);
  }

  /**
   * Crée une erreur 403 "Interdit"
   * @param {string} [message="Accès interdit"] - Message d'erreur
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 403
   */
  static forbidden(message = 'Accès interdit') {
    return new ErrorHandler(message, 403);
  }

  /**
   * Crée une erreur 500 "Erreur serveur"
   * @param {string} [message="Erreur serveur interne"] - Message d'erreur
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 500
   */
  static internal(message = 'Erreur serveur interne') {
    return new ErrorHandler(message, 500);
  }

  /**
   * Crée une erreur de validation
   * @param {Object|Array|string} errors - Erreurs de validation
   * @returns {ErrorHandler} - Instance d'ErrorHandler avec code 400
   */
  static validation(errors) {
    const message = 'Erreur de validation';
    return new ErrorHandler(message, 400, { errors });
  }

  /**
   * Convertit l'erreur en objet pour la réponse JSON
   * @returns {Object} - Objet représentant l'erreur
   */
  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      message: this.message,
      ...(this.details && { details: this.details }),
      timestamp: this.timestamp,
    };
  }
}

export default ErrorHandler;
