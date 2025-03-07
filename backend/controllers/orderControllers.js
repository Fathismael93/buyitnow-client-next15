/* eslint-disable no-unused-vars */
import Order from '../models/order';
import APIFilters from '../utils/APIFilters';
import User from '../models/user';
import Product from '../models/product';
import Cart from '../models/cart';
// eslint-disable-next-line no-unused-vars
import Category from '../models/category';
import ErrorHandler from '../utils/errorHandler';
import DeliveryPrice from '../models/deliveryPrice';
import { captureException } from '@/monitoring/sentry';
import mongoose from 'mongoose';

/**
 * Récupère les commandes de l'utilisateur connecté
 * @route GET /api/orders/me
 */
export const myOrders = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Paramètres de pagination
    const resPerPage = 5; // Augmenter le nombre d'éléments par page pour réduire les requêtes

    // Compter le nombre total de commandes de l'utilisateur
    const ordersCount = await Order.countDocuments({ user: user._id });

    // Appliquer les filtres et la pagination
    const apiFilters = new APIFilters(Order.find(), req.query).pagination(
      resPerPage,
    );

    // Récupérer les commandes de l'utilisateur avec leurs informations associées
    const orders = await apiFilters.query
      .find({ user: user._id })
      .populate('shippingInfo user')
      .populate({
        path: 'orderItems.product',
        select: 'name images',
      })
      .sort({ createdAt: -1 });

    // Calculer le nombre total de pages
    const result = ordersCount / resPerPage;
    const totalPages = Number.isInteger(result) ? result : Math.ceil(result);

    // Récupérer les frais de livraison
    const deliveryPrice = await DeliveryPrice.find();

    // Agréger les statistiques des commandes de l'utilisateur
    const orderStats = {
      totalOrders: ordersCount,
      totalSpent: await Order.aggregate([
        { $match: { user: user._id } },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: ['$orderItems.price', '$orderItems.quantity'],
              },
            },
          },
        },
      ]).then((result) => result[0]?.total || 0),
      mostOrderedCategories: await Order.aggregate([
        { $match: { user: user._id } },
        { $unwind: '$orderItems' },
        { $group: { _id: '$orderItems.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]),
    };

    return res.status(200).json({
      success: true,
      deliveryPrice,
      totalPages,
      orders,
      orderStats,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_my_orders' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Traite un webhook pour créer une nouvelle commande
 * @route POST /api/orders/webhook
 */
export const webhook = async (req, res, next) => {
  // Utiliser une session MongoDB pour garantir la cohérence des transactions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let orderData;
    try {
      orderData = JSON.parse(req.body);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier les données requises
    if (
      !orderData.orderItems ||
      !Array.isArray(orderData.orderItems) ||
      orderData.orderItems.length === 0
    ) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler('Aucun article dans la commande', 400));
    }

    if (!orderData.shippingInfo) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new ErrorHandler('Informations de livraison manquantes', 400),
      );
    }

    if (!orderData.paymentInfo || !orderData.paymentInfo.amountPaid) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler('Informations de paiement manquantes', 400));
    }

    // Ajouter l'utilisateur à la commande
    orderData.user = user._id;

    // Extraire les IDs, quantités et IDs de panier des produits commandés
    const productsInfo = orderData.orderItems.map((item) => ({
      id: item.product,
      quantity: item.quantity,
      cartId: item.cartId,
    }));

    // Supprimer les IDs de panier des éléments de commande
    orderData.orderItems.forEach((item) => {
      delete item.cartId;
      // Garantir que la catégorie est définie
      if (!item.category) {
        item.category = 'Non catégorisé';
      }
    });

    // Vérifier la disponibilité des produits et mettre à jour les stocks
    const unavailableProducts = [];
    const updatedProducts = [];

    for (let i = 0; i < productsInfo.length; i++) {
      const { id, quantity, cartId } = productsInfo[i];

      // Trouver le produit et sa catégorie
      const product = await Product.findById(id)
        .populate('category')
        .session(session);

      if (!product) {
        unavailableProducts.push({
          id,
          name: `Produit ID: ${id}`,
          image: '/images/default_product.png',
          stock: 0,
          quantity,
        });
        continue;
      }

      // Mettre à jour la catégorie dans les données de commande
      orderData.orderItems[i].category =
        product.category?.categoryName || 'Non catégorisé';

      // Vérifier si la quantité demandée est disponible
      if (product.stock < quantity) {
        unavailableProducts.push({
          id: product._id,
          name: product.name,
          image: product.images[0]?.url || '/images/default_product.png',
          stock: product.stock,
          quantity,
        });
        continue;
      }

      // Mettre à jour le stock du produit
      const newStock = product.stock - quantity;
      const productUpdated = await Product.findByIdAndUpdate(
        product._id,
        { stock: newStock },
        { new: true, session },
      );

      updatedProducts.push(productUpdated);
    }

    // Vérifier si tous les produits sont disponibles
    if (unavailableProducts.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        inavailableStockProducts: unavailableProducts,
        message:
          'Certains produits ne sont pas disponibles en quantité suffisante',
      });
    }

    // Créer la commande
    const order = await Order.create([orderData], { session });

    // Supprimer les articles du panier
    for (const { cartId } of productsInfo) {
      if (cartId) {
        await Cart.findByIdAndDelete(cartId, { session });
      }
    }

    // Valider la transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      id: order[0]?._id,
      message: 'Commande créée avec succès',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    captureException(error, {
      tags: { action: 'create_order' },
      extra: { user: req.user?.email },
    });

    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère les détails d'une commande
 * @route GET /api/orders/:id
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (!id) {
      return next(new ErrorHandler('ID de commande requis', 400));
    }

    const order = await Order.findById(id)
      .populate('shippingInfo user')
      .populate({
        path: 'orderItems.product',
        select: 'name images',
      });

    if (!order) {
      return next(new ErrorHandler('Commande non trouvée', 404));
    }

    // Vérifier que l'utilisateur est autorisé à voir cette commande
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorHandler('Non autorisé à accéder à cette commande', 403),
      );
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_order_details' },
      extra: { orderId: req.query.id, user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Met à jour le statut d'une commande
 * @route PUT /api/orders/:id
 * @access Admin only
 */
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (!id) {
      return next(new ErrorHandler('ID de commande requis', 400));
    }

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return next(
        new ErrorHandler('Non autorisé à mettre à jour les commandes', 403),
      );
    }

    const order = await Order.findById(id);

    if (!order) {
      return next(new ErrorHandler('Commande non trouvée', 404));
    }

    // Valider et parser le corps de la requête
    let updateData;
    try {
      updateData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier que le statut est valide
    const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (
      updateData.orderStatus &&
      !validStatuses.includes(updateData.orderStatus)
    ) {
      return next(new ErrorHandler('Statut de commande non valide', 400));
    }

    // Vérifier que le statut de paiement est valide
    const validPaymentStatuses = ['paid', 'unpaid', 'refunded'];
    if (
      updateData.paymentStatus &&
      !validPaymentStatuses.includes(updateData.paymentStatus)
    ) {
      return next(new ErrorHandler('Statut de paiement non valide', 400));
    }

    // Mettre à jour les champs
    if (updateData.orderStatus) {
      order.orderStatus = updateData.orderStatus;
    }

    if (updateData.paymentStatus) {
      order.paymentStatus = updateData.paymentStatus;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      order,
      message: 'Commande mise à jour avec succès',
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'update_order' },
      extra: { orderId: req.query.id, user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};
