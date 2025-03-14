/* eslint-disable no-unused-vars */
import User from '../models/user';
import Cart from '../models/cart';
import { DECREASE, INCREASE } from '@/helpers/constants';
import Product from '../models/product';
import ErrorHandler from '../utils/errorHandler';
import { captureException } from '@/monitoring/sentry';

/**
 * Ajoute un produit au panier
 * @route POST /api/cart
 */
export const newCart = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let cartData;
    try {
      cartData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier que le productId est présent
    if (!cartData.productId) {
      return next(new ErrorHandler('ID de produit requis', 400));
    }

    // Vérifier que le produit existe
    const product = await Product.findById(cartData.productId);

    if (!product) {
      return next(new ErrorHandler('Produit non trouvé', 404));
    }

    // Vérifier si le produit est déjà dans le panier
    const existingCartItem = await Cart.findOne({
      user: user._id,
      product: product._id,
    });

    if (existingCartItem) {
      // Si le produit est déjà dans le panier, augmenter la quantité
      const newQuantity = existingCartItem.quantity + 1;

      // Vérifier si la quantité demandée est disponible
      if (newQuantity > product.stock) {
        return next(new ErrorHandler('Quantité demandée non disponible', 400));
      }

      existingCartItem.quantity = newQuantity;
      await existingCartItem.save();

      return res.status(200).json({
        success: true,
        cartAdded: existingCartItem,
        message: 'Quantité augmentée dans le panier',
      });
    }

    // Définir la quantité par défaut à 1
    const quantity = 1;

    // Vérifier si la quantité demandée est disponible
    if (quantity > product.stock) {
      return next(new ErrorHandler('Produit non disponible en stock', 400));
    }

    // Créer l'élément de panier
    const cart = {
      product: product._id,
      user: user._id,
      quantity,
    };

    const cartAdded = await Cart.create(cart);

    return res.status(201).json({
      success: true,
      cartAdded,
      message: 'Produit ajouté au panier',
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'add_to_cart' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère le panier de l'utilisateur
 * @route GET /api/cart
 */
export const getCart = async (req, res, next) => {
  console.log('Nous sommes dans le GET CART controller');
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    console.log('Utilisateur existant');

    // Récupérer les articles du panier
    let cartItems = await Cart.find({ user: user._id }).populate({
      path: 'product',
      select: 'name price images stock category',
    });

    console.log('Panier récuperer');

    // Vérifier si des produits du panier dépassent le stock disponible
    // et ajuster les quantités en conséquence
    const updatedCartItems = [];

    for (const item of cartItems) {
      if (!item.product) {
        // Si le produit a été supprimé, supprimer l'élément du panier
        await Cart.findByIdAndDelete(item._id);
        continue;
      }

      if (item.quantity > item.product.stock) {
        // Ajuster la quantité au stock disponible
        item.quantity = item.product.stock;
        await item.save();
      }

      updatedCartItems.push(item);
    }

    // Recalculer le nombre d'articles dans le panier
    const cartCount = updatedCartItems.length;

    // Calculer le total du panier
    const cartTotal = updatedCartItems.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    console.log("Entrain d'envoyer le response pour le panier");
    console.log('cartCount: ');
    console.log(cartCount);
    console.log('updatedCartItems: ');
    console.log(updatedCartItems);
    console.log('cartTotal: ');
    console.log(cartTotal);

    return res.status(200).json({
      success: true,
      cartCount,
      cart: updatedCartItems,
      cartTotal,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_cart' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Met à jour un article du panier (quantité)
 * @route PUT /api/cart
 */
export const updateCart = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Valider et parser le corps de la requête
    let updateData;
    try {
      updateData = JSON.parse(req.body);
    } catch (err) {
      return next(new ErrorHandler('Format JSON invalide', 400));
    }

    // Vérifier les données requises
    if (!updateData.product || !updateData.value) {
      return next(new ErrorHandler('Données de mise à jour incomplètes', 400));
    }

    const { product, value } = updateData;

    // Vérifier que le produit existe
    const productFromDB = await Product.findById(product.product._id);

    if (!productFromDB) {
      return next(new ErrorHandler('Produit non trouvé', 404));
    }

    // Si l'utilisateur veut augmenter la quantité
    if (value === INCREASE) {
      const neededQuantity = product.quantity + 1;

      // Vérifier si la quantité demandée est disponible
      if (neededQuantity > productFromDB.stock) {
        return next(new ErrorHandler('Quantité non disponible', 400));
      }

      const updatedCart = await Cart.findByIdAndUpdate(
        product._id,
        { quantity: neededQuantity },
        { new: true },
      );

      if (updatedCart) {
        return res.status(200).json('Quantité mise à jour dans le panier');
      } else {
        return next(
          new ErrorHandler('Erreur lors de la mise à jour du panier', 500),
        );
      }
    }

    // Si l'utilisateur veut diminuer la quantité
    if (value === DECREASE) {
      const neededQuantity = product.quantity - 1;

      // Vérifier que la quantité n'est pas inférieure à 1
      if (neededQuantity < 1) {
        return next(
          new ErrorHandler('La quantité ne peut pas être inférieure à 1', 400),
        );
      }

      const updatedCart = await Cart.findByIdAndUpdate(
        product._id,
        { quantity: neededQuantity },
        { new: true },
      );

      if (updatedCart) {
        return res.status(200).json('Quantité mise à jour dans le panier');
      } else {
        return next(
          new ErrorHandler('Erreur lors de la mise à jour du panier', 500),
        );
      }
    }

    return next(new ErrorHandler('Opération non valide', 400));
  } catch (error) {
    captureException(error, {
      tags: { action: 'update_cart' },
      extra: { user: req.user?.email },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Supprime un article du panier
 * @route DELETE /api/cart/:id
 */
export const deleteCart = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur existe
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('Utilisateur non trouvé', 404));
    }

    // Vérifier que l'ID de l'article est fourni
    const cartId = req.query.id;
    if (!cartId) {
      return next(new ErrorHandler("ID de l'article du panier requis", 400));
    }

    // Vérifier que l'article du panier existe et appartient à l'utilisateur
    const cartItem = await Cart.findById(cartId);

    if (!cartItem) {
      return next(new ErrorHandler('Article du panier non trouvé', 404));
    }

    if (cartItem.user.toString() !== user._id.toString()) {
      return next(
        new ErrorHandler('Non autorisé à supprimer cet article', 403),
      );
    }

    // Supprimer l'article du panier
    await Cart.findByIdAndDelete(cartId);

    return res.status(200).json({
      success: true,
      message: 'Article supprimé du panier',
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'delete_from_cart' },
      extra: { user: req.user?.email, cartId: req.query.id },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};
