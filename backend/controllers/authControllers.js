/* eslint-disable no-unused-vars */
import User from '../models/user';
import cloudinary, { uploads } from '../utils/cloudinary';
import fs from 'fs';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import Contact from '../models/contact';
import ErrorHandler from '../utils/errorHandler';
import { captureException } from '@/monitoring/sentry';

// Configurer le transporteur de mail avec validation
let transporter;
try {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true pour port 465, false pour les autres ports
    auth: {
      user: process.env.NODEMAILER_EMAIL_ACCOUNT,
      pass: process.env.NODEMAILER_PASSWORD_ACCOUNT,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production', // Valider les certificats en production
    },
  });
} catch (error) {
  console.error(
    'Erreur lors de la configuration du transporteur email:',
    error,
  );
  captureException(error, {
    tags: { service: 'email', action: 'configure_transporter' },
    level: 'error',
  });
}

/**
 * Valide les données d'inscription d'un nouvel utilisateur de manière exhaustive
 * @param {Object} userData - Données utilisateur à valider
 * @returns {Object} - Objet contenant le résultat de validation et les erreurs éventuelles
 */
const validateUserData = (userData) => {
  const errors = {};

  // Valider et sanitiser la présence des champs obligatoires
  if (!userData) {
    return {
      isValid: false,
      errors: { global: 'Aucune donnée fournie' },
    };
  }

  const { name, email, phone, password } = userData;

  // Validation du nom
  if (!name || typeof name !== 'string') {
    errors.name = 'Le nom est requis';
  } else if (name.trim().length < 2) {
    errors.name = 'Le nom doit contenir au moins 2 caractères';
  } else if (name.trim().length > 100) {
    errors.name = 'Le nom ne doit pas dépasser 100 caractères';
  } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name.trim())) {
    errors.name = 'Le nom contient des caractères non autorisés';
  } else if (/\s{2,}/.test(name)) {
    errors.name = 'Le nom ne peut pas contenir des espaces consécutifs';
  }

  // Validation de l'email
  if (!email || typeof email !== 'string') {
    errors.email = "L'email est requis";
  } else {
    // Trim et normalisation pour la validation
    const normalizedEmail = email.trim().toLowerCase();

    // Validation RFC-compliant pour email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      errors.email = "Format d'email invalide";
    } else if (normalizedEmail.length > 254) {
      // RFC 5321 SMTP limit
      errors.email = "L'email ne doit pas dépasser 254 caractères";
    } else {
      // Vérification des domaines d'email temporaires
      const tempEmailDomains = [
        'yopmail.com',
        'mailinator.com',
        'tempmail.com',
        'temp-mail.org',
        'guerrillamail.com',
        'throwawaymail.com',
        '10minutemail.com',
        'mailnesia.com',
        'trashmail.com',
        'sharklasers.com',
      ];

      const emailDomain = normalizedEmail.split('@')[1];
      if (tempEmailDomains.includes(emailDomain)) {
        errors.email = 'Les adresses email temporaires ne sont pas autorisées';
      }
    }
  }

  // Validation du téléphone
  if (!phone || typeof phone !== 'string') {
    errors.phone = 'Le numéro de téléphone est requis';
  } else {
    // Supprimer les espaces pour la validation
    const normalizedPhone = phone.trim().replace(/\s/g, '');

    // Validation internationale des numéros de téléphone
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      errors.phone = 'Format de téléphone invalide (ex: +33612345678)';
    } else if (normalizedPhone.length > 20) {
      errors.phone = 'Le numéro de téléphone est trop long';
    }
  }

  // Validation du mot de passe
  if (!password) {
    errors.password = 'Le mot de passe est requis';
  } else if (typeof password !== 'string') {
    errors.password = 'Format de mot de passe invalide';
  } else if (password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  } else if (password.length > 128) {
    errors.password = 'Le mot de passe ne doit pas dépasser 128 caractères';
  } else {
    // Vérification de la force du mot de passe
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      errors.password =
        'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre';
    }

    // Vérification des espaces au début ou à la fin
    if (password !== password.trim()) {
      errors.password =
        "Le mot de passe ne doit pas contenir d'espaces au début ou à la fin";
    }

    // Vérification des mots de passe courants
    const commonPasswords = [
      'Password123',
      'Azerty123',
      'Qwerty123',
      '123456Aa',
      'Admin123',
    ];
    if (commonPasswords.includes(password)) {
      errors.password = 'Ce mot de passe est trop courant et facile à deviner';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    // Retourner les données sanitisées si valides
    sanitizedData:
      Object.keys(errors).length === 0
        ? {
            name: name?.trim(),
            email: email?.trim().toLowerCase(),
            phone: phone?.trim().replace(/\s/g, ''),
            password,
          }
        : null,
  };
};

/**
 * Enregistre un nouvel utilisateur avec validation robuste et gestion d'erreurs avancée
 * @route POST /api/auth/register
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Middleware suivant
 * @returns {Promise<Object>} - Réponse avec l'utilisateur créé ou message d'erreur
 */
export const registerUser = async (req, res, next) => {
  // Mesurer les performances
  const startTime = Date.now();
  let sanitizedEmail = null;

  try {
    // Extraire les données du corps de la requête
    let userData;
    try {
      // Vérifier si le corps est déjà un objet ou une chaîne à parser
      userData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return next(new ErrorHandler('Format de données invalide', 400));
    }

    // Utiliser la fonction validateUserData pour valider toutes les données
    const validation = validateUserData(userData);

    // Si la validation échoue, retourner les erreurs
    if (!validation.isValid) {
      return next(
        new ErrorHandler('Validation échouée', 400, validation.errors),
      );
    }

    // Récupérer les données sanitisées
    const { name, email, phone, password } = validation.sanitizedData;

    // Conserver une version anonymisée de l'email pour la journalisation sécurisée
    sanitizedEmail = email
      ? `${email.substring(0, 3)}...${email.includes('@') ? `@${email.split('@')[1]}` : ''}`
      : 'non fourni';

    // Vérifier si l'email existe déjà avec une gestion d'erreur robuste
    const existingUser = await User.findOne({ email }).lean().maxTimeMS(5000); // Ajouter un timeout et optimiser avec lean()

    if (existingUser) {
      return next(new ErrorHandler('Cet email est déjà utilisé', 409)); // Code 409 Conflict pour email existant
    }

    // Créer l'utilisateur avec données sanitisées
    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      role: 'user', // Définir explicitement le rôle pour éviter les escalades de privilèges
    });

    // Vérifier que l'utilisateur a bien été créé
    if (!newUser) {
      throw new Error("Échec de création de l'utilisateur");
    }

    // Mesurer le temps de création
    const duration = Date.now() - startTime;

    // Tenter d'enregistrer les performances pour le monitoring (sans bloquer la réponse)
    try {
      if (process.env.NODE_ENV === 'production') {
        const { recordMetric } = require('@/monitoring/sentry');
        recordMetric('auth.register.duration', duration, {
          tags: { success: true },
        });
      }
    } catch (metricError) {
      // Ne pas bloquer la réponse si la métrique échoue
      console.warn(
        "Échec d'enregistrement des métriques:",
        metricError.message,
      );
    }

    // Retirer le mot de passe et les champs sensibles de la réponse
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    // Retourner la réponse de succès
    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: userResponse,
    });
  } catch (error) {
    // Capturer l'exception avec des informations de contexte sécurisées
    captureException(error, {
      tags: {
        action: 'register_user',
        errorType: error.name || 'unknown',
      },
      extra: {
        sanitizedEmail, // Utiliser l'email anonymisé pour la sécurité
        duration: Date.now() - startTime,
      },
    });

    // Vérifier les erreurs spécifiques MongoDB
    if (error.code === 11000) {
      // Erreur de clé dupliquée (généralement email)
      return next(
        new ErrorHandler(
          'Un utilisateur avec ces informations existe déjà',
          409,
        ),
      );
    }

    // Journaliser l'erreur mais ne pas exposer les détails techniques à l'utilisateur
    console.error("Erreur d'inscription:", error.message);

    // En production, retourner un message générique
    if (process.env.NODE_ENV === 'production') {
      return next(
        new ErrorHandler("Une erreur est survenue lors de l'inscription", 500),
      );
    }

    // En développement, retourner les détails pour le débogage
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Met à jour le profil de l'utilisateur connecté
 * @route PUT /api/auth/me/update
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    };

    // Validation des données
    if (newUserData.name && newUserData.name.trim().length < 2) {
      return next(
        new ErrorHandler('Le nom doit contenir au moins 2 caractères', 400),
      );
    }

    if (newUserData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserData.email)) {
        return next(new ErrorHandler('Email invalide', 400));
      }

      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      const existingUser = await User.findOne({
        email: newUserData.email,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return next(new ErrorHandler('Cet email est déjà utilisé', 400));
      }
    }

    if (newUserData.phone) {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(newUserData.phone)) {
        return next(new ErrorHandler('Numéro de téléphone invalide', 400));
      }
    }

    // Traitement de l'image de profil
    if (req.files && req.files.length > 0) {
      try {
        const uploader = async (path) =>
          await uploads(path, 'buyitnow/avatars');

        const file = req.files[0];
        const { path } = file;

        const avatarResponse = await uploader(path);

        // Supprimer le fichier temporaire après upload
        fs.unlinkSync(path);

        // Si l'utilisateur a déjà un avatar, supprimer l'ancien de Cloudinary
        if (user.avatar && user.avatar.public_id) {
          await cloudinary.uploader.destroy(user.avatar.public_id);
        }

        newUserData.avatar = avatarResponse;
      } catch (uploadError) {
        return next(
          new ErrorHandler("Erreur lors de l'upload de l'image", 500),
        );
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      newUserData,
      { new: true, runValidators: true },
    );

    // Retirer le mot de passe de la réponse
    updatedUser.password = undefined;

    return res.status(200).json({
      success: true,
      updatedUser,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'update_profile' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Met à jour le mot de passe de l'utilisateur connecté
 * @route PUT /api/auth/me/update_password
 */
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select(
      '+password',
    );

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let passwordData;
    try {
      passwordData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier que les champs requis sont présents
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      return next(
        new ErrorHandler(
          'Les mots de passe actuels et nouveaux sont requis',
          400,
        ),
      );
    }

    // Vérifier que le nouveau mot de passe est assez long
    if (passwordData.newPassword.length < 6) {
      return next(
        new ErrorHandler(
          'Le nouveau mot de passe doit contenir au moins 6 caractères',
          400,
        ),
      );
    }

    // Vérifier que le mot de passe actuel correspond
    const isPasswordMatched = await bcrypt.compare(
      passwordData.currentPassword,
      user.password,
    );

    if (!isPasswordMatched) {
      return next(
        new ErrorHandler('Le mot de passe actuel est incorrect', 400),
      );
    }

    // Mettre à jour le mot de passe
    user.password = passwordData.newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'update_password' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Envoie un email de contact
 * @route POST /api/emails
 */
export const sendEmail = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let emailData;
    try {
      emailData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier que les champs requis sont présents
    if (!emailData?.subject || !emailData?.message) {
      return next(new ErrorHandler('Le sujet et le message sont requis', 400));
    }

    // Vérification supplémentaire contre les spams
    if (emailData.message.length < 10) {
      return next(new ErrorHandler('Le message est trop court', 400));
    }

    if (emailData.subject.length < 3) {
      return next(new ErrorHandler('Le sujet est trop court', 400));
    }

    // Préparer le message pour enregistrement
    const messageSent = {
      from: user?._id,
      subject: emailData.subject,
      message: emailData.message,
    };

    // Limiter le nombre d'emails envoyés par utilisateur par jour
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const emailCount = await Contact.countDocuments({
      from: user._id,
      createdAt: { $gte: last24Hours },
    });

    if (emailCount >= 5) {
      return next(
        new ErrorHandler(
          'Limite de messages journalière atteinte. Veuillez réessayer demain.',
          429,
        ),
      );
    }

    // Envoyer l'email
    try {
      if (!transporter) {
        throw new Error('Configuration email non disponible');
      }

      await transporter.sendMail({
        from: {
          name: user.name,
          address: user.email,
        },
        to: process.env.NODEMAILER_EMAIL_ACCOUNT,
        subject: `Contact - ${emailData.subject}`,
        html: `
          <h2>Nouveau message de contact</h2>
          <p><strong>De:</strong> ${user.name} (${user.email})</p>
          <p><strong>Téléphone:</strong> ${user.phone || 'Non fourni'}</p>
          <p><strong>Message:</strong></p>
          <div style="padding: 10px; border-left: 4px solid #ccc;">
            ${emailData.message.replace(/\n/g, '<br>')}
          </div>
        `,
        replyTo: user.email,
      });

      // Enregistrer le message dans la base de données
      await Contact.create(messageSent);

      return res.status(201).json({
        success: true,
        message: 'Message envoyé avec succès',
      });
    } catch (emailError) {
      captureException(emailError, {
        tags: { action: 'send_email' },
        extra: { user: req.user?.email },
      });
      return next(
        new ErrorHandler(
          "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard.",
          500,
        ),
      );
    }
  } catch (error) {
    captureException(error, {
      tags: { action: 'send_email' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};
