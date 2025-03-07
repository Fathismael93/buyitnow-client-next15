import { v2 as cloudinary } from 'cloudinary';
import { captureException } from '@/monitoring/sentry';

// Configuration de Cloudinary avec les variables d'environnement
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Toujours utiliser HTTPS
});

/**
 * Valide les paramètres d'upload
 * @param {string} file - Chemin du fichier à télécharger
 * @param {string} folder - Dossier de destination
 * @returns {Object} - Résultat de la validation
 */
const validateUploadParams = (file, folder) => {
  const errors = [];

  if (!file) {
    errors.push('Chemin du fichier manquant');
  }

  if (!folder) {
    errors.push('Dossier de destination manquant');
  }

  // Vérifier l'extension du fichier (si le chemin est disponible)
  if (file && typeof file === 'string') {
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
    ];
    const fileExtension = file.substring(file.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Extension de fichier non autorisée: ${fileExtension}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Télécharge un fichier sur Cloudinary
 * @param {string} file - Chemin du fichier à télécharger
 * @param {string} folder - Dossier de destination
 * @param {Object} options - Options supplémentaires pour l'upload
 * @returns {Promise<Object>} - Informations sur l'image téléchargée
 */
export const uploads = async (file, folder, options = {}) => {
  try {
    // Valider les paramètres
    const validation = validateUploadParams(file, folder);
    if (!validation.isValid) {
      throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
    }

    // Configuration par défaut de l'upload
    const defaultOptions = {
      resource_type: 'auto',
      folder: folder,
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      quality: 'auto', // Compression automatique
      fetch_format: 'auto', // Conversion au format le plus optimal
      responsive_breakpoints: {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 1000,
        max_images: 5,
      },
      transformation: [{ width: 'auto', crop: 'scale', quality: 'auto' }],
    };

    // Fusionner avec les options personnalisées
    const uploadOptions = {
      ...defaultOptions,
      ...options,
    };

    // Effectuer l'upload
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    // Retourner seulement les informations nécessaires
    return {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
    };
  } catch (error) {
    captureException(error, {
      tags: {
        action: 'cloudinary_upload',
        folder,
      },
      extra: { file },
    });

    throw new Error(`Erreur lors de l'upload sur Cloudinary: ${error.message}`);
  }
};

/**
 * Supprime un fichier de Cloudinary
 * @param {string} publicId - ID public du fichier à supprimer
 * @returns {Promise<Object>} - Résultat de la suppression
 */
export const removeFile = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('ID public requis pour la suppression');
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { invalidate: true },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );
    });

    return {
      success: result.result === 'ok',
      result,
    };
  } catch (error) {
    captureException(error, {
      tags: { action: 'cloudinary_remove' },
      extra: { publicId },
    });

    throw new Error(
      `Erreur lors de la suppression sur Cloudinary: ${error.message}`,
    );
  }
};

/**
 * Génère une URL optimisée pour une image Cloudinary
 * @param {string} publicId - ID public de l'image
 * @param {Object} options - Options de transformation
 * @returns {string} - URL optimisée
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  try {
    if (!publicId) {
      return '';
    }

    // Options par défaut pour les images optimisées
    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      crop: 'scale',
      width: 'auto',
    };

    // Fusionner avec les options personnalisées
    const transformationOptions = {
      ...defaultOptions,
      ...options,
    };

    return cloudinary.url(publicId, transformationOptions);
  } catch (error) {
    captureException(error, {
      tags: { action: 'cloudinary_get_url' },
      extra: { publicId, options },
    });
    return '';
  }
};

/**
 * Crée un tag signature pour les uploads côté client sécurisés
 * @param {Object} params - Paramètres à signer
 * @returns {Object} - Timestamp et signature
 */
export const generateSignature = (params = {}) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, ...params },
      process.env.CLOUDINARY_API_SECRET,
    );

    return {
      timestamp,
      signature,
    };
  } catch (error) {
    captureException(error, {
      tags: { action: 'cloudinary_generate_signature' },
    });
    throw new Error(
      `Erreur lors de la génération de la signature: ${error.message}`,
    );
  }
};

export default cloudinary;
