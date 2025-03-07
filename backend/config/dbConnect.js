import mongoose from 'mongoose';
import { captureException } from '@/monitoring/sentry';

// Variables globales
const MONGODB_URI = process.env.DB_URI;
let cached = global.mongoose;

// Initialiser le cache si non existant
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Fonction pour se connecter à MongoDB avec optimisations et gestion d'erreurs
 * @returns {Promise<Mongoose>} - Instance de connexion Mongoose
 */
const dbConnect = async () => {
  // Si déjà connecté, retourner la connexion existante
  if (cached.conn) {
    return cached.conn;
  }

  // Vérifier si l'URI est définie
  if (!MONGODB_URI) {
    throw new Error('Veuillez définir DB_URI dans le fichier .env');
  }

  // Si une connexion est en cours, attendre sa résolution
  if (!cached.promise) {
    const opts = {
      // Options de connexion recommandées pour MongoDB et Mongoose
      bufferCommands: false,
      maxPoolSize: 10, // Garder un nombre raisonnable de connexions
      minPoolSize: 5, // Connexions minimales (utile en production)
      socketTimeoutMS: 45000, // Éviter déconnexion trop rapide
      connectTimeoutMS: 10000, // 10 secondes max pour se connecter
      serverSelectionTimeoutMS: 10000, // 10 sec max pour sélection serveur
      family: 4, // Forcer IPv4 (plus stable dans certains environnements)
      heartbeatFrequencyMS: 10000, // Fréquence de pulsation pour la réplication
      autoIndex: process.env.NODE_ENV !== 'production', // Désactiver l'auto-indexation en production
    };

    mongoose.set('strictQuery', false);

    // Définir un hook global pour les connexions
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connecté avec succès');
    });

    mongoose.connection.on('error', (err) => {
      console.log('Erreur MongoDB:', err);
      captureException(err, {
        tags: { service: 'database', action: 'connect' },
      });
    });

    // Gérer la reconnexion automatique
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB déconnecté, tentative de reconnexion...');
    });

    // Gérer la fermeture propre lors de l'arrêt de l'application
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log("Connexion MongoDB fermée suite à l'arrêt de l'application");
      process.exit(0);
    });

    // Stocker la promesse de connexion dans le cache
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        return mongoose;
      })
      .catch((err) => {
        console.error('Erreur de connexion MongoDB:', err);
        captureException(err, {
          tags: { service: 'database', action: 'connect' },
          level: 'fatal',
        });
        throw err; // Propager l'erreur
      });
  }

  // Attendre la résolution de la promesse
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
};

export default dbConnect;
