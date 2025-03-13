/**
 * Utilitaires pour la gestion du panier d'achat
 */

/**
 * Calcule le prix total du panier
 * @param {Array} cart - Articles du panier
 * @returns {number} - Montant total
 */
export const calculateCartTotal = (cart = []) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    return 0;
  }

  return cart.reduce((total, item) => {
    // Validation pour éviter NaN
    const price =
      typeof item.product?.price === 'number'
        ? item.product.price
        : parseFloat(item.product?.price) || 0;

    const quantity =
      typeof item.quantity === 'number'
        ? item.quantity
        : parseInt(item.quantity, 10) || 0;

    return total + price * quantity;
  }, 0);
};

/**
 * Vérifie la disponibilité du stock pour un produit
 * @param {Object} product - Produit à vérifier
 * @param {number} requestedQuantity - Quantité demandée
 * @returns {Object} - Informations sur la disponibilité
 */
export const checkProductAvailability = (product, requestedQuantity = 1) => {
  if (!product) {
    return {
      isAvailable: false,
      isLowStock: false,
      maxAvailable: 0,
      message: 'Produit non disponible',
    };
  }

  const stock =
    typeof product.stock === 'number'
      ? product.stock
      : parseInt(product.stock, 10) || 0;

  const quantity =
    typeof requestedQuantity === 'number'
      ? requestedQuantity
      : parseInt(requestedQuantity, 10) || 1;

  // Stock épuisé
  if (stock <= 0) {
    return {
      isAvailable: false,
      isLowStock: false,
      maxAvailable: 0,
      message: 'Produit épuisé',
    };
  }

  // Stock faible (5 ou moins)
  const isLowStock = stock <= 5;

  // Stock insuffisant pour la quantité demandée
  if (stock < quantity) {
    return {
      isAvailable: true,
      isLowStock: true,
      maxAvailable: stock,
      message: `Seulement ${stock} unité${stock > 1 ? 's' : ''} disponible${stock > 1 ? 's' : ''}`,
    };
  }

  // Stock disponible
  return {
    isAvailable: true,
    isLowStock,
    maxAvailable: stock,
    message: isLowStock
      ? `Stock limité: ${stock} unité${stock > 1 ? 's' : ''}`
      : 'En stock',
  };
};

/**
 * Valide les articles du panier (stock, incohérences, etc.)
 * @param {Array} cart - Articles du panier
 * @returns {Object} - Résultat de la validation
 */
export const validateCart = (cart = []) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      isValid: true,
      invalidItems: [],
      messages: [],
    };
  }

  const invalidItems = [];
  const messages = [];

  cart.forEach((item) => {
    // Vérifier que le produit existe
    if (!item.product || !item.product._id) {
      invalidItems.push(item._id);
      messages.push(`Un article du panier n'est plus disponible`);
      return;
    }

    // Vérifier la disponibilité du stock
    const availability = checkProductAvailability(item.product, item.quantity);

    if (!availability.isAvailable) {
      invalidItems.push(item._id);
      messages.push(`"${item.product.name}" n'est plus en stock`);
    } else if (availability.maxAvailable < item.quantity) {
      invalidItems.push(item._id);
      messages.push(
        `Stock insuffisant pour "${item.product.name}" (${availability.maxAvailable} disponible${availability.maxAvailable > 1 ? 's' : ''})`,
      );
    }
  });

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
    messages: [...new Set(messages)], // Supprimer les doublons
  };
};

/**
 * Trie les articles du panier selon différents critères
 * @param {Array} cart - Articles du panier
 * @param {string} sortBy - Critère de tri ('price', 'name', 'date', 'quantity')
 * @param {boolean} ascending - Ordre ascendant ou descendant
 * @returns {Array} - Articles triés
 */
export const sortCartItems = (cart = [], sortBy = 'date', ascending = true) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    return [];
  }

  const sortedCart = [...cart];

  // Fonction pour comparer selon différents critères
  const getSortValue = (item, criterion) => {
    switch (criterion) {
      case 'price':
        return item.product?.price || 0;
      case 'name':
        return item.product?.name || '';
      case 'quantity':
        return item.quantity || 0;
      case 'date':
      default:
        return new Date(item.createdAt || 0).getTime();
    }
  };

  // Trier les articles
  return sortedCart.sort((a, b) => {
    const valueA = getSortValue(a, sortBy);
    const valueB = getSortValue(b, sortBy);

    // Tri ascendant ou descendant
    return ascending ? (valueA > valueB ? 1 : -1) : valueA < valueB ? 1 : -1;
  });
};

/**
 * Récupère les articles du panier depuis le localStorage (fallback)
 * @returns {Object} - Données du panier
 */
export const getCartFromLocalStorage = () => {
  try {
    const data = localStorage.getItem('buyitnow_cart');
    if (!data) {
      return { count: 0, items: [], lastUpdated: null };
    }

    const parsedData = JSON.parse(data);

    // Valider le format des données
    if (!parsedData || typeof parsedData !== 'object') {
      return { count: 0, items: [], lastUpdated: null };
    }

    return {
      count: parseInt(parsedData.count, 10) || 0,
      items: Array.isArray(parsedData.items) ? parsedData.items : [],
      lastUpdated: parsedData.lastUpdated || null,
    };
  } catch (error) {
    console.error(
      'Erreur lors de la récupération du panier depuis localStorage:',
      error,
    );
    return { count: 0, items: [], lastUpdated: null };
  }
};

/**
 * Regroupe les articles du panier par catégorie pour l'analyse
 * @param {Array} cart - Articles du panier
 * @returns {Object} - Articles regroupés par catégorie
 */
export const groupCartByCategory = (cart = []) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {};
  }

  const groupedItems = {};

  cart.forEach((item) => {
    const categoryId = item.product?.category?._id || 'uncategorized';
    const categoryName =
      item.product?.category?.categoryName || 'Non catégorisé';

    if (!groupedItems[categoryId]) {
      groupedItems[categoryId] = {
        name: categoryName,
        items: [],
        totalQuantity: 0,
        totalPrice: 0,
      };
    }

    groupedItems[categoryId].items.push(item);
    groupedItems[categoryId].totalQuantity += item.quantity || 0;
    groupedItems[categoryId].totalPrice +=
      (item.product?.price || 0) * (item.quantity || 0);
  });

  return groupedItems;
};
