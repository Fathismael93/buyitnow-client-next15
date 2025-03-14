import Product from '../models/product';
import Category from '../models/category';
import APIFilters from '../utils/APIFilters';
import ErrorHandler from '../utils/errorHandler';
import { captureException } from '@/monitoring/sentry';
import { getCacheHeaders } from '@/utils/cache';

/**
 * Récupère la liste des produits avec filtrage et pagination
 * @route GET /api/products
 */
export const getProducts = async (req, res, next) => {
  try {
    // Définir le nombre d'éléments par page
    const resPerPage = 2;
    const cacheControl = getCacheHeaders('products');

    // Appliquer les filtres de recherche et de catégorie
    const apiFilters = new APIFilters(Product.find(), req.query)
      .search()
      .filter();

    // Récupérer tous les produits filtrés pour le compte
    let products = await apiFilters.query.populate('category');
    const filteredProductsCount = products.length;

    // Appliquer la pagination
    apiFilters.pagination(resPerPage);

    // Récupérer les produits avec pagination
    products = await apiFilters.query.populate('category').clone();

    // Calculer le nombre total de pages
    const result = filteredProductsCount / resPerPage;
    const totalPages = Number.isInteger(result) ? result : Math.ceil(result);

    // Récupérer toutes les catégories pour les filtres
    const categories = await Category.find().sort({ categoryName: 1 });

    // Calculer les statistiques par catégorie
    const categoryStats = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: '$categoryInfo.categoryName',
        },
      },
    ]);

    // Calculer les statistiques de prix
    const priceStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' },
        },
      },
    ]).then((result) => result[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 });

    // Enrichir les données des produits
    const enhancedProducts = products.map((product) => {
      // Vérifier la disponibilité du stock
      const stockStatus =
        product.stock > 10
          ? 'in_stock'
          : product.stock > 0
            ? 'low_stock'
            : 'out_of_stock';

      return {
        ...product.toObject(),
        stockStatus,
      };
    });

    return res.status(200).json({
      success: true,
      categories,
      totalPages,
      productsCount: filteredProductsCount,
      products: enhancedProducts,
      categoryStats,
      priceStats,
      resPerPage,
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_products' },
      extra: { query: req.query },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère les détails d'un produit spécifique
 * @route GET /api/products/:id
 */
export const getProduct = async (req, res, next) => {
  try {
    const productId = req.query.id;

    if (!productId) {
      return next(new ErrorHandler('ID de produit requis', 400));
    }

    const cacheControl = getCacheHeaders('product');

    // Récupérer les détails du produit
    const product = await Product.findById(productId).populate('category');

    if (!product) {
      return next(new ErrorHandler('Produit non trouvé', 404));
    }

    // Récupérer les produits de la même catégorie (limité à 5)
    const sameCategoryProducts = await Product.find({
      category: product?.category,
      _id: { $ne: product._id }, // Exclure le produit actuel
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculer les produits recommandés (par exemple, les plus populaires de la catégorie)
    const recommendedProducts = await Product.find({
      category: product?.category,
      stock: { $gt: 0 },
      _id: { $ne: product._id },
    })
      .sort({ stock: -1 }) // Les plus en stock d'abord
      .limit(3);

    // Vérifier la disponibilité du stock
    const stockStatus =
      product.stock > 10
        ? 'in_stock'
        : product.stock > 0
          ? 'low_stock'
          : 'out_of_stock';

    console.log('stock status checked');

    // Enrichir les données du produit
    const enhancedProduct = {
      ...product.toObject(),
      stockStatus,
      isAvailable: product.stock > 0,
    };

    return res.status(200).json({
      success: true,
      sameCategoryProducts,
      recommendedProducts,
      product: enhancedProduct,
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_product' },
      extra: { productId: req.query.id },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère les produits les plus vendus
 * @route GET /api/products/top-selling
 */
export const getTopSellingProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const cacheControl = getCacheHeaders('products');

    // Cette fonctionnalité nécessiterait un champ 'sold' dans le modèle Product
    // Ou une agrégation à partir des commandes
    // Ici, nous supposons que les produits avec le moins de stock restant sont les plus vendus
    const topSellingProducts = await Product.find({ stock: { $gt: 0 } })
      .sort({ stock: 1 })
      .limit(limit)
      .populate('category');

    return res.status(200).json({
      success: true,
      products: topSellingProducts,
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_top_selling_products' },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Récupère les produits par catégorie
 * @route GET /api/products/category/:categoryId
 */
export const getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return next(new ErrorHandler('ID de catégorie requis', 400));
    }

    const cacheControl = getCacheHeaders('products');

    // Vérifier que la catégorie existe
    const category = await Category.findById(categoryId);

    if (!category) {
      return next(new ErrorHandler('Catégorie non trouvée', 404));
    }

    // Récupérer les produits de la catégorie
    const products = await Product.find({ category: categoryId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      category,
      productsCount: products.length,
      products,
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'get_products_by_category' },
      extra: { categoryId: req.query.categoryId },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};

/**
 * Recherche de produits par mot-clé
 * @route GET /api/products/search
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return next(new ErrorHandler('Mot-clé de recherche requis', 400));
    }

    // Recherche insensible à la casse et partielle
    const products = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
    })
      .populate('category')
      .limit(20);

    return res.status(200).json({
      success: true,
      keyword,
      productsCount: products.length,
      products,
    });
  } catch (error) {
    captureException(error, {
      tags: { action: 'search_products' },
      extra: { keyword: req.query.keyword },
    });
    return next(new ErrorHandler(error.message, 500));
  }
};
