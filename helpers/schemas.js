import * as yup from 'yup';
import { LIMITS } from './constants';

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Veuillez entrer une adresse email valide')
    .required("L'email est requis")
    .trim(),
  password: yup
    .string()
    .required('Le mot de passe est requis')
    .min(
      LIMITS.MIN_PASSWORD_LENGTH,
      `Le mot de passe doit contenir au moins ${LIMITS.MIN_PASSWORD_LENGTH} caractères`,
    ),
});

/**
 * Schéma de validation pour l'inscription
 */
export const registerSchema = yup.object().shape({
  name: yup
    .string()
    .required('Le nom est requis')
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .matches(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets',
    )
    .trim(),
  phone: yup
    .string()
    .required('Le numéro de téléphone est requis')
    .matches(
      /^\+?[0-9]{10,15}$/,
      'Le numéro de téléphone doit être au format valide (ex: +33612345678)',
    )
    .trim(),
  email: yup
    .string()
    .email('Veuillez entrer une adresse email valide')
    .required("L'email est requis")
    .trim(),
  password: yup
    .string()
    .required('Le mot de passe est requis')
    .min(
      LIMITS.MIN_PASSWORD_LENGTH,
      `Le mot de passe doit contenir au moins ${LIMITS.MIN_PASSWORD_LENGTH} caractères`,
    )
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre',
    ),
  confirmPassword: yup
    .string()
    .oneOf(
      [yup.ref('password'), null],
      'Les mots de passe doivent correspondre',
    )
    .required('La confirmation du mot de passe est requise'),
});

/**
 * Schéma de validation pour la recherche
 */
export const searchSchema = yup.object().shape({
  keyword: yup
    .string()
    .required('Le mot-clé de recherche est requis')
    .min(1, 'Le mot-clé de recherche est trop court')
    .max(100, 'Le mot-clé de recherche est trop long')
    .trim(),
});

/**
 * Schéma de validation pour la mise à jour du profil
 */
export const profileSchema = yup.object().shape({
  name: yup
    .string()
    .required('Le nom est requis')
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .matches(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets',
    )
    .trim(),
  phone: yup
    .string()
    .required('Le numéro de téléphone est requis')
    .matches(
      /^\+?[0-9]{10,15}$/,
      'Le numéro de téléphone doit être au format valide (ex: +33612345678)',
    )
    .trim(),
  email: yup
    .string()
    .email('Veuillez entrer une adresse email valide')
    .required("L'email est requis")
    .trim(),
  avatar: yup
    .mixed()
    .test('fileSize', 'Le fichier est trop volumineux (max 5 MB)', (value) => {
      if (!value) return true;
      return value.size <= LIMITS.MAX_FILE_SIZE;
    })
    .test(
      'fileType',
      'Format de fichier non supporté (JPG, PNG, WEBP uniquement)',
      (value) => {
        if (!value) return true;
        return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
      },
    ),
});

/**
 * Schéma de validation pour les adresses
 */
export const addressSchema = yup.object().shape({
  street: yup
    .string()
    .required("L'adresse est requise")
    .min(3, "L'adresse doit contenir au moins 3 caractères")
    .max(100, "L'adresse ne doit pas dépasser 100 caractères")
    .trim(),
  city: yup
    .string()
    .required('La ville est requise')
    .min(3, 'La ville doit contenir au moins 3 caractères')
    .max(50, 'La ville ne doit pas dépasser 50 caractères')
    .matches(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'La ville ne peut contenir que des lettres, espaces, apostrophes et tirets',
    )
    .trim(),
  state: yup
    .string()
    .required('La région est requise')
    .min(2, 'La région doit contenir au moins 2 caractères')
    .max(50, 'La région ne doit pas dépasser 50 caractères')
    .trim(),
  zipCode: yup
    .string()
    .required('Le code postal est requis')
    .matches(/^[0-9]{5}$/, 'Le code postal doit contenir 5 chiffres')
    .trim(),
  phoneNo: yup
    .string()
    .required('Le numéro de téléphone est requis')
    .matches(
      /^\+?[0-9]{10,15}$/,
      'Le numéro de téléphone doit être au format valide (ex: +33612345678)',
    )
    .trim(),
  country: yup
    .string()
    .required('Le pays est requis')
    .min(3, 'Le pays doit contenir au moins 3 caractères')
    .max(50, 'Le pays ne doit pas dépasser 50 caractères')
    .matches(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'Le pays ne peut contenir que des lettres, espaces, apostrophes et tirets',
    )
    .trim(),
});

/**
 * Schéma de validation pour les informations de paiement
 */
export const paymentSchema = yup.object().shape({
  paymentType: yup.string().required('Le mode de paiement est requis').trim(),
  accountName: yup
    .string()
    .required('Le nom du titulaire du compte est requis')
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .matches(
      /^[a-zA-ZÀ-ÿ\s'-]+$/,
      'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets',
    )
    .trim(),
  accountNumber: yup
    .string()
    .required('Le numéro de compte est requis')
    .matches(
      /^[0-9]{1,20}$/,
      'Le numéro de compte doit contenir uniquement des chiffres',
    )
    .min(4, 'Le numéro de compte doit contenir au moins 4 chiffres')
    .trim(),
});

/**
 * Schéma de validation pour les emails de contact
 */
export const emailSchema = yup.object().shape({
  subject: yup
    .string()
    .required('Le sujet est requis')
    .min(5, 'Le sujet doit contenir au moins 5 caractères')
    .max(100, 'Le sujet ne doit pas dépasser 100 caractères')
    .trim(),
  message: yup
    .string()
    .required('Le message est requis')
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message ne doit pas dépasser 2000 caractères')
    .trim(),
});

/**
 * Schéma de validation pour les avis produits
 */
export const reviewSchema = yup.object().shape({
  rating: yup
    .number()
    .required('La note est requise')
    .min(1, 'La note minimum est 1')
    .max(5, 'La note maximum est 5'),
  comment: yup
    .string()
    .required('Le commentaire est requis')
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(500, 'Le commentaire ne doit pas dépasser 500 caractères')
    .trim(),
});

/**
 * Schéma de validation pour la mise à jour du mot de passe
 */
export const passwordUpdateSchema = yup.object().shape({
  currentPassword: yup
    .string()
    .required('Le mot de passe actuel est requis')
    .min(
      LIMITS.MIN_PASSWORD_LENGTH,
      `Le mot de passe doit contenir au moins ${LIMITS.MIN_PASSWORD_LENGTH} caractères`,
    ),
  newPassword: yup
    .string()
    .required('Le nouveau mot de passe est requis')
    .min(
      LIMITS.MIN_PASSWORD_LENGTH,
      `Le mot de passe doit contenir au moins ${LIMITS.MIN_PASSWORD_LENGTH} caractères`,
    )
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre',
    )
    .notOneOf(
      [yup.ref('currentPassword')],
      "Le nouveau mot de passe doit être différent de l'ancien",
    ),
  confirmNewPassword: yup
    .string()
    .oneOf(
      [yup.ref('newPassword'), null],
      'Les mots de passe doivent correspondre',
    )
    .required('La confirmation du mot de passe est requise'),
});

/**
 * Schéma de validation pour les filtres de produits
 */
export const productFilterSchema = yup.object().shape({
  keyword: yup.string().trim(),
  category: yup.string().trim(),
  min: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === null || value === undefined ? undefined : value,
    )
    .min(0, 'Le prix minimum ne peut pas être négatif'),
  max: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === null || value === undefined ? undefined : value,
    )
    .min(0, 'Le prix maximum ne peut pas être négatif')
    .test(
      'max',
      'Le prix maximum doit être supérieur au prix minimum',
      function (max) {
        const { min } = this.parent;
        if (min === undefined || max === undefined) return true;
        return max > min;
      },
    ),
  page: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === null || value === undefined ? 1 : value,
    )
    .min(1, 'Le numéro de page doit être supérieur à 0')
    .integer('Le numéro de page doit être un entier'),
});
