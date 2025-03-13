/* eslint-disable react/prop-types */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { arrayHasData, getPriceQueryParams } from '@/helpers/helpers';
import { toast } from 'react-toastify';

const Filters = ({ categories, setLoading }) => {
  const searchParams = useSearchParams();
  const [min, setMin] = useState(searchParams.get('min') || '');
  const [max, setMax] = useState(searchParams.get('max') || '');
  const [open, setOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(
    searchParams.get('category') || '',
  );

  const router = useRouter();

  const handleCategoryClick = (categoryId) => {
    setLoading(true);

    let queryParams;
    if (typeof window !== 'undefined') {
      queryParams = new URLSearchParams(window.location.search);
    }

    // Si on clique sur la catégorie déjà sélectionnée, on la désélectionne
    if (currentCategory === categoryId) {
      queryParams.delete('category');
      setCurrentCategory('');
    } else {
      queryParams.set('category', categoryId);
      setCurrentCategory(categoryId);
    }

    // Reset page parameter when changing filters
    if (queryParams.has('page')) {
      queryParams.delete('page');
    }

    const path = window.location.pathname + '?' + queryParams.toString();
    setOpen(false);
    router.push(path);
  };

  const handlePriceFilter = () => {
    setLoading(true);

    try {
      if (typeof window !== 'undefined') {
        let queryParams = new URLSearchParams(window.location.search);

        // Validation des prix
        if (min && max && Number(min) > Number(max)) {
          toast.error(
            'Le prix minimum ne peut pas être supérieur au prix maximum',
          );
          setLoading(false);
          return;
        }

        queryParams = getPriceQueryParams(queryParams, 'min', min);
        queryParams = getPriceQueryParams(queryParams, 'max', max);

        // Reset page parameter when changing filters
        if (queryParams.has('page')) {
          queryParams.delete('page');
        }

        const path = window.location.pathname + '?' + queryParams.toString();
        setOpen(false);
        router.push(path);
      }
    } catch (error) {
      toast.error(error.message || "Une erreur s'est produite");
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setLoading(true);
    setMin('');
    setMax('');
    setCurrentCategory('');
    router.push('/');
    setOpen(false);
  };

  return (
    <aside className="md:w-1/3 lg:w-1/4 px-4">
      <div className="sticky top-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 hidden md:block">
            Filtres
          </h2>

          <button
            className="md:hidden w-full mb-4 py-2 px-4 bg-white border border-gray-200 rounded-md shadow-sm flex justify-between items-center"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="font-medium text-gray-700">Filtres</span>
            <i
              className={`fa fa-${open ? 'chevron-up' : 'chevron-down'} text-gray-500`}
            ></i>
          </button>

          {(min || max || currentCategory) && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 hidden md:block"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className={`${open ? 'block' : 'hidden'} md:block space-y-4`}>
          {/* Prix */}
          <div className="p-4 border border-gray-200 bg-white rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-700">Prix (€)</h3>
            <div className="grid grid-cols-2 gap-x-2 mb-3">
              <div>
                <label
                  htmlFor="min-price"
                  className="text-xs text-gray-500 mb-1 block"
                >
                  Min
                </label>
                <input
                  id="min-price"
                  name="min"
                  className="appearance-none border border-gray-200 bg-gray-100 rounded-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-blue-500 w-full"
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="max-price"
                  className="text-xs text-gray-500 mb-1 block"
                >
                  Max
                </label>
                <input
                  id="max-price"
                  name="max"
                  className="appearance-none border border-gray-200 bg-gray-100 rounded-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-blue-500 w-full"
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
            </div>

            <button
              className="w-full py-2 px-4 bg-blue-600 text-white cursor-pointer rounded-md hover:bg-blue-700 transition-colors"
              onClick={handlePriceFilter}
            >
              Appliquer
            </button>
          </div>

          {/* Catégories */}
          <div className="p-4 border border-gray-200 bg-white rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-700">Catégories</h3>

            {arrayHasData(categories) ? (
              <div className="w-full text-center py-2">
                <p className="text-gray-500">Aucune catégorie disponible</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories?.map((category) => (
                  <button
                    key={category?._id}
                    className={`flex items-center w-full p-2 rounded-md transition-colors cursor-pointer ${
                      currentCategory === category?._id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => handleCategoryClick(category?._id)}
                  >
                    <span className="ml-2">{category?.categoryName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton réinitialiser mobile */}
          {(min || max || currentCategory) && (
            <div className="md:hidden">
              <button
                onClick={resetFilters}
                className="w-full py-2 text-center text-sm text-red-600 hover:text-red-800 border border-red-200 cursor-pointer rounded-md hover:bg-red-50"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Filters;
