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
 * Valide les données d'inscription d'un nouvel utilisateur
 * @param {Object} userData - Données utilisateur à valider
 * @returns {Object} - Objet contenant les erreurs de validation, s'il y en a
 */
const validateUserData = (userData) => {
  const errors = {};

  // Validation du nom
  if (!userData.name || userData.name.trim().length < 2) {
    errors.name = 'Le nom doit contenir au moins 2 caractères';
  }

  // Validation de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    errors.email = 'Email invalide';
  }

  // Validation du téléphone
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!userData.phone || !phoneRegex.test(userData.phone)) {
    errors.phone = 'Numéro de téléphone invalide';
  }

  // Validation du mot de passe
  if (!userData.password || userData.password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Enregistre un nouvel utilisateur
 * @route POST /api/auth/register
 */
export const registerUser = async (req, res, next) => {
  try {
    // Valider et parser le corps de la requête
    let userData;
    try {
      userData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Valider les données utilisateur
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      return next(
        new ErrorHandler('Validation échouée', 400, validation.errors),
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return next(new ErrorHandler('Cet email est déjà utilisé', 400));
    }

    // Créer l'utilisateur
    const { name, phone, email, password } = userData;
    const user = await User.create({
      name,
      phone,
      email,
      password,
    });

    // Retirer le mot de passe de la réponse
    user.password = undefined;

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'register_user' },
    });
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
