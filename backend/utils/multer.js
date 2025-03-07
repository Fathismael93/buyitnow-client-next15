import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { captureException } from '@/monitoring/sentry';
import ErrorHandler from './errorHandler';

// Créer le dossier temp s'il n'existe pas
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configuration du stockage temporaire
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique pour éviter les collisions
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const fileExt = path.extname(file.originalname);
    const sanitizedName = path
      .basename(file.originalname, fileExt)
      .replace(/[^a-zA-Z0-9]/g, '-'); // Assainir le nom du fichier

    cb(null, `${sanitizedName}-${uniqueSuffix}${fileExt}`);
  },
});

// Liste des types MIME autorisés
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

// Limites pour les fichiers
const LIMITS = {
  fileSize: 5 * 1024 * 1024, // 5MB max
  files: 5, // 5 fichiers max par requête
};

// Filtre pour les fichiers acceptés
const fileFilter = (req, file, cb) => {
  try {
    const mimeType = file.mimetype.toLowerCase();
    const fileExt = path.extname(file.originalname).toLowerCase();

    // Vérifier si le type MIME est autorisé
    if (!Object.keys(ALLOWED_MIME_TYPES).includes(mimeType)) {
      return cb(
        new ErrorHandler(
          `Format de fichier non supporté. Types autorisés: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
          400,
        ),
        false,
      );
    }

    // Vérifier si l'extension correspond au type MIME
    if (!ALLOWED_MIME_TYPES[mimeType].includes(fileExt)) {
      return cb(
        new ErrorHandler(
          `L'extension du fichier ne correspond pas au type de contenu`,
          400,
        ),
        false,
      );
    }

    // Fichier accepté
    cb(null, true);
  } catch (error) {
    captureException(error, {
      tags: {
        service: 'file_upload',
        action: 'file_filter',
      },
    });
    cb(new ErrorHandler('Erreur lors de la validation du fichier', 500), false);
  }
};

/**
 * Nettoie les fichiers temporaires après le traitement de la requête
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 */
export const cleanupFiles = (req, res, next) => {
  // Nettoyer les fichiers après l'envoi de la réponse
  res.on('finish', () => {
    if (req.files) {
      // Si un tableau de fichiers
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err)
              console.error(
                `Erreur lors de la suppression du fichier ${file.path}:`,
                err,
              );
          });
        });
      }
      // Si un objet avec des propriétés de fichiers
      else if (typeof req.files === 'object') {
        Object.keys(req.files).forEach((key) => {
          const file = req.files[key];
          fs.unlink(file.path, (err) => {
            if (err)
              console.error(
                `Erreur lors de la suppression du fichier ${file.path}:`,
                err,
              );
          });
        });
      }
    }

    // Si un seul fichier
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error(
            `Erreur lors de la suppression du fichier ${req.file.path}:`,
            err,
          );
      });
    }
  });

  next();
};

// Créer et configurer l'instance multer
const upload = multer({
  storage,
  limits: LIMITS,
  fileFilter,
});

// Nettoyer les fichiers plus anciens que 1 heure
const cleanupOldFiles = () => {
  const oneHourAgo = Date.now() - 3600000;

  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('Erreur lors de la lecture du répertoire temp:', err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(
            `Erreur lors de la récupération des stats pour ${filePath}:`,
            err,
          );
          return;
        }

        if (stats.mtimeMs < oneHourAgo) {
          fs.unlink(filePath, (err) => {
            if (err)
              console.error(
                `Erreur lors de la suppression de ${filePath}:`,
                err,
              );
          });
        }
      });
    });
  });
};

// Nettoyer les fichiers toutes les heures
setInterval(cleanupOldFiles, 3600000);

export default upload;
