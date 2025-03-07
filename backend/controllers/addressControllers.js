import Address from '../models/address';
import ErrorHandler from '../utils/errorHandler';
import User from '../models/user';
import PaymentType from '../models/paymentType';
import DeliveryPrice from '../models/deliveryPrice';
import { captureException } from '@/monitoring/sentry';

/**
 * Crée une nouvelle adresse pour l'utilisateur connecté
 * @route POST /api/address
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} - Réponse JSON avec l'adresse créée
 */
export const newAddress = async (req, res, next) => {
  try {
    // Trouver l'utilisateur connecté
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let addressData;
    try {
      addressData = JSON.parse(req.body);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier la présence des champs obligatoires
    const requiredFields = [
      'street',
      'city',
      'state',
      'phoneNo',
      'zipCode',
      'country',
    ];
    const missingFields = requiredFields.filter((field) => !addressData[field]);

    if (missingFields.length > 0) {
      return next(
        new ErrorHandler(
          `Champs obligatoires manquants: ${missingFields.join(', ')}`,
          400,
        ),
      );
    }

    // Ajouter l'ID utilisateur à l'adresse
    addressData.user = user._id;

    // Créer l'adresse
    const address = await Address.create(addressData);

    return res.status(201).json({
      success: true,
      address,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'create_address' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère toutes les adresses de l'utilisateur connecté
 * @route GET /api/address
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} - Réponse JSON avec les adresses de l'utilisateur
 */
export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req?.user?.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Récupérer les adresses de l'utilisateur
    const addresses = await Address.find({ user: user?._id }).sort({
      createdAt: -1,
    });

    // Si des adresses sont trouvées, récupérer également les moyens de paiement et les frais de livraison
    if (addresses) {
      const paymentTypes = await PaymentType.find();
      const deliveryPrice = await DeliveryPrice.find();

      return res.status(200).json({
        success: true,
        addresses,
        paymentTypes,
        deliveryPrice,
      });
    } else {
      return res.status(200).json({
        success: true,
        addresses: [],
      });
    }
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_addresses' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère une adresse spécifique
 * @route GET /api/address/:id
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} - Réponse JSON avec l'adresse demandée
 */
export const getAddress = async (req, res, next) => {
  try {
    // Vérifier que l'ID est valide
    if (!req?.query?.id) {
      return next(new ErrorHandler("ID d'adresse requis", 400));
    }

    const address = await Address.findById(req?.query?.id);

    if (!address) {
      return next(new ErrorHandler('Adresse non trouvée', 404));
    }

    // Vérifier que l'adresse appartient à l'utilisateur connecté
    if (address.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler('Non autorisé à accéder à cette adresse', 403),
      );
    }

    return res.status(200).json({
      success: true,
      address,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_address' },
      extra: { addressId: req.query?.id },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Met à jour une adresse existante
 * @route PUT /api/address/:id
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} - Réponse JSON avec l'adresse mise à jour
 */
export const updateAddress = async (req, res, next) => {
  try {
    const addressId = req.query.id;

    // Vérifier que l'ID est valide
    if (!addressId) {
      return next(new ErrorHandler("ID d'adresse requis", 400));
    }

    // Valider et parser le corps de la requête
    let addressData;
    try {
      addressData = JSON.parse(req.body);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier que l'adresse existe
    const oldAddress = await Address.findById(addressId);

    if (!oldAddress) {
      return next(new ErrorHandler('Adresse non trouvée', 404));
    }

    // Vérifier que l'adresse appartient à l'utilisateur connecté
    if (oldAddress.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler('Non autorisé à modifier cette adresse', 403),
      );
    }

    // Mettre à jour l'adresse
    const address = await Address.findByIdAndUpdate(addressId, addressData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      address,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'update_address' },
      extra: { addressId: req.query?.id },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Supprime une adresse
 * @route DELETE /api/address/:id
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} - Réponse JSON de succès
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const addressId = req.query.id;

    // Vérifier que l'ID est valide
    if (!addressId) {
      return next(new ErrorHandler("ID d'adresse requis", 400));
    }

    // Vérifier que l'adresse existe
    const address = await Address.findById(addressId);

    if (!address) {
      return next(new ErrorHandler('Adresse non trouvée', 404));
    }

    // Vérifier que l'adresse appartient à l'utilisateur connecté
    if (address.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler('Non autorisé à supprimer cette adresse', 403),
      );
    }

    // Supprimer l'adresse
    await Address.findByIdAndDelete(addressId);

    return res.status(200).json({
      success: true,
      message: 'Adresse supprimée avec succès',
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'delete_address' },
      extra: { addressId: req.query?.id },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};
