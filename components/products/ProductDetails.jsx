/* eslint-disable react/prop-types */
'use client';

import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-toastify';
import AuthContext from '@/context/AuthContext';
import CartContext from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { INCREASE } from '@/helpers/constants';
import { memoizeWithTTL } from '@/utils/performance';
import { formatPrice } from '@/helpers/helpers';

// Chargement dynamique pour la performance
const BreadCrumbs = dynamic(() => import('@/components/layouts/BreadCrumbs'), {
  ssr: true,
});

// Constantes pour améliorer la lisibilité et la maintenance
const IMAGE_PLACEHOLDER = '/images/default_product.png';
const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

// Fonction utilitaire pour vérifier si un tableau est vide ou non défini
const hasData = (array) => {
  return array && Array.isArray(array) && array.length > 0;
};

const ProductDetails = ({
  product,
  sameCategoryProducts,
  recommendedProducts,
}) => {
  const { user } = useContext(AuthContext);
  const { addItemToCart, updateCart, cart } = useContext(CartContext);

  // Valider le produit pour éviter les erreurs si les données sont manquantes
  const isValidProduct = useMemo(
    () => product && typeof product === 'object',
    [product],
  );

  // State pour l'image sélectionnée avec une valeur par défaut sécurisée
  const [selectedImage, setSelectedImage] = useState(
    isValidProduct && product.images?.[0]?.url
      ? product.images[0].url
      : IMAGE_PLACEHOLDER,
  );

  // État pour gérer l'animation de chargement
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // État pour gérer la quantité
  const [quantity, setQuantity] = useState(1);

  // Recalculer la liste des produits associés seulement quand nécessaire
  const relatedProducts = useMemo(() => {
    if (!hasData(sameCategoryProducts)) return [];
    return sameCategoryProducts.filter((item) => item?._id !== product?._id);
  }, [sameCategoryProducts, product?._id]);

  // Vérifier l'état du stock de manière optimisée
  const stockStatus = useMemo(() => {
    if (!isValidProduct) return STOCK_STATUS.OUT_OF_STOCK;

    const stock = product.stock || 0;
    if (stock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
    if (stock <= 5) return STOCK_STATUS.LOW_STOCK;
    return STOCK_STATUS.IN_STOCK;
  }, [isValidProduct, product?.stock]);

  // Vérifier si le produit est en stock
  const inStock = useMemo(
    () => stockStatus !== STOCK_STATUS.OUT_OF_STOCK,
    [stockStatus],
  );

  // Mettre à jour l'image sélectionnée si le produit change
  useEffect(() => {
    if (isValidProduct && product.images?.[0]?.url) {
      setSelectedImage(product.images[0].url);
    } else {
      setSelectedImage(IMAGE_PLACEHOLDER);
    }
  }, [isValidProduct, product]);

  // Calculer le fil d'Ariane avec mémorisation
  const breadCrumbs = useMemo(() => {
    if (!isValidProduct) return null;

    return [
      { name: 'Accueil', url: '/' },
      {
        name: product.category?.categoryName || 'Catégorie',
        url: `/?category=${product.category?._id || ''}`,
      },
      {
        name:
          product.name?.substring(0, 40) +
          (product.name?.length > 40 ? '...' : ''),
        url: `/product/${product._id}`,
      },
    ];
  }, [isValidProduct, product]);

  // Fonction mémorisée pour la sélection d'image
  const handleImageSelect = useCallback((imageUrl) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
    }
  }, []);

  // Fonction mémorisée pour mettre à jour la quantité
  const updateQuantity = useCallback(
    (delta) => {
      setQuantity((prev) => {
        const newValue = prev + delta;
        // Limiter entre 1 et le stock disponible
        if (newValue < 1) return 1;
        if (isValidProduct && product.stock && newValue > product.stock) {
          return product.stock;
        }
        return newValue;
      });
    },
    [isValidProduct, product?.stock],
  );

  // Gestion optimisée de l'ajout au panier
  const addToCartHandler = useCallback(async () => {
    if (!user) {
      toast.error(
        'Veuillez vous connecter pour ajouter des articles à votre panier',
      );
      return;
    }

    if (!inStock) {
      toast.error('Ce produit est épuisé');
      return;
    }

    if (!isValidProduct) {
      toast.error("Impossible d'ajouter ce produit au panier");
      return;
    }

    try {
      setIsAddingToCart(true);

      const isProductInCart = cart.find((i) => i?.product?._id === product._id);

      if (isProductInCart) {
        // Si déjà dans le panier, mise à jour avec la quantité totale
        const totalQuantity = isProductInCart.quantity + quantity;

        if (totalQuantity > product.stock) {
          toast.warning(
            `Stock limité à ${product.stock} unités pour ce produit`,
          );
          await updateCart(
            {
              ...isProductInCart,
              quantity: product.stock,
            },
            INCREASE,
          );
        } else {
          // Simuler plusieurs augmentations pour gérer des quantités > 1
          for (let i = 0; i < quantity; i++) {
            await updateCart(isProductInCart, INCREASE);
          }
        }
      } else {
        // Ajouter comme nouveau produit avec la quantité spécifiée
        await addItemToCart({
          product: product._id,
          quantity,
        });
      }

      toast.success(
        `${quantity} ${quantity > 1 ? 'articles ajoutés' : 'article ajouté'} au panier`,
      );

      // Réinitialiser la quantité après l'ajout
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error("Une erreur est survenue lors de l'ajout au panier");
    } finally {
      setIsAddingToCart(false);
    }
  }, [
    user,
    inStock,
    isValidProduct,
    cart,
    product,
    quantity,
    updateCart,
    addItemToCart,
  ]);

  // Rendu pour produit non trouvé
  if (!isValidProduct) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="w-24 h-24 text-gray-300 mx-auto mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Produit non disponible
          </h1>
          <p className="text-gray-600 mb-6">
            Le produit que vous recherchez n'existe pas ou a été retiré.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {breadCrumbs && <BreadCrumbs breadCrumbs={breadCrumbs} />}

      <section className="bg-white py-8 md:py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Informations produit - Section principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Galerie d'images */}
            <div className="space-y-4">
              {/* Image principale */}
              <div className="border border-gray-200 shadow-sm p-2 rounded-lg bg-white flex items-center justify-center h-80 md:h-96 relative overflow-hidden">
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  priority={true}
                  onError={() => setSelectedImage(IMAGE_PLACEHOLDER)}
                />
              </div>

              {/* Sélection d'images */}
              {hasData(product.images) && (
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      className={`flex-shrink-0 border-2 w-16 h-16 rounded overflow-hidden flex items-center justify-center ${
                        selectedImage === img.url
                          ? 'border-blue-500 ring-2 ring-blue-300'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleImageSelect(img.url)}
                      aria-label={`Voir image ${index + 1}`}
                    >
                      <Image
                        src={img.url || IMAGE_PLACEHOLDER}
                        alt={`${product.name} - Vue ${index + 1}`}
                        width={60}
                        height={60}
                        className="object-cover"
                        onError={(e) => {
                          e.target.src = IMAGE_PLACEHOLDER;
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Détails produit */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>

                {/* Badges de statut */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {stockStatus === STOCK_STATUS.IN_STOCK && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      En stock
                    </span>
                  )}
                  {stockStatus === STOCK_STATUS.LOW_STOCK && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Stock limité
                    </span>
                  )}
                  {stockStatus === STOCK_STATUS.OUT_OF_STOCK && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Épuisé
                    </span>
                  )}
                  {product.category?.categoryName && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {product.category.categoryName}
                    </span>
                  )}
                </div>
              </div>

              {/* Prix */}
              <div className="py-4 border-t border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Description
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Sélection de quantité et ajout au panier */}
              <div className="pt-4">
                <div className="mb-4">
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Quantité
                  </label>
                  <div className="flex items-center border border-gray-300 rounded w-32">
                    <button
                      type="button"
                      className="w-10 h-10 text-gray-600 hover:text-gray-900 focus:outline-none"
                      onClick={() => updateQuantity(-1)}
                      disabled={quantity <= 1}
                    >
                      <span className="sr-only">Diminuer</span>
                      <svg
                        className="w-5 h-5 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      </svg>
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      className="w-12 border-0 text-center focus:ring-0"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setQuantity(Math.min(val, product.stock || 99));
                        }
                      }}
                      min="1"
                      max={product.stock || 99}
                    />
                    <button
                      type="button"
                      className="w-10 h-10 text-gray-600 hover:text-gray-900 focus:outline-none"
                      onClick={() => updateQuantity(1)}
                      disabled={quantity >= (product.stock || 99)}
                    >
                      <span className="sr-only">Augmenter</span>
                      <svg
                        className="w-5 h-5 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Affichage du stock disponible */}
                  <p className="text-sm text-gray-500 mt-1">
                    {product.stock > 0 ? (
                      <>
                        <span>{product.stock}</span>{' '}
                        {product.stock > 1
                          ? 'unités disponibles'
                          : 'unité disponible'}
                      </>
                    ) : (
                      'Produit épuisé'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full md:w-auto px-6 py-3 text-base font-medium rounded-md shadow-sm text-white ${
                    inStock
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                      : 'bg-gray-400 cursor-not-allowed'
                  } transition-colors duration-200 flex items-center justify-center`}
                  onClick={addToCartHandler}
                  disabled={!inStock || isAddingToCart}
                >
                  {isAddingToCart ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {inStock ? 'Ajouter au panier' : 'Produit épuisé'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Produits similaires */}
          {hasData(relatedProducts) && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Produits similaires
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {relatedProducts.slice(0, 4).map((relatedProduct) => (
                  <Link
                    key={relatedProduct._id}
                    href={`/product/${relatedProduct._id}`}
                    className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      <Image
                        src={
                          relatedProduct.images?.[0]?.url || IMAGE_PLACEHOLDER
                        }
                        alt={relatedProduct.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {relatedProduct.name}
                      </h3>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900">
                          {formatPrice(relatedProduct.price)}
                        </span>

                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            relatedProduct.stock > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {relatedProduct.stock > 0 ? 'En stock' : 'Épuisé'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

// Optimiser avec mémoisation
export default React.memo(ProductDetails);
