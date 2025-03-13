/* eslint-disable react/prop-types */
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import React, { memo, useEffect, useState } from 'react';
import ResponsivePaginationComponent from 'react-responsive-pagination';
import 'react-responsive-pagination/themes/classic.css';

// @ts-ignore
const CustomPagination = memo(({ totalPages }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);

  // Get the current page from URL or default to 1
  let page = Number(searchParams.get('page') || 1);

  // S'assurer que la page est un nombre valide
  if (isNaN(page) || page < 1) {
    page = 1;
  } else if (page > totalPages) {
    page = totalPages;
  }

  // Mise à jour de l'URL avec les paramètres de pagination
  const handlePageChange = (currentPage) => {
    setIsChangingPage(true);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      if (currentPage === 1 && params.has('page')) {
        params.delete('page');
      } else if (currentPage !== 1) {
        params.set('page', currentPage);
      }

      // Conserver la position dans l'URL
      const path =
        pathname + (params.toString() ? `?${params.toString()}` : '');
      router.push(path);

      // Scroll to top when page changes
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // Restaurer l'état après changement de page
  useEffect(() => {
    if (isChangingPage) {
      setIsChangingPage(false);
    }
  }, [searchParams, isChangingPage]);

  // Ne pas afficher la pagination s'il n'y a qu'une seule page
  if (totalPages <= 1) {
    return null;
  }

  // Générer les pages à afficher
  const getPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5; // Limiter le nombre de pages affichées sur mobile

    // Toujours afficher la première page
    if (page > 2) {
      items.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className="hidden sm:flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-blue-50 hover:text-blue-700"
        >
          1
        </button>,
      );
    }

    // Afficher l'ellipse si nécessaire
    if (page > 3) {
      items.push(
        <span
          key="ellipsis-start"
          className="hidden sm:flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300"
        >
          ...
        </span>,
      );
    }

    // Calculer la plage de pages à afficher
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Ajuster la plage si nécessaire
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Générer les boutons de pagination
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`flex items-center justify-center px-3 h-8 leading-tight ${
            page === i
              ? 'text-blue-600 bg-blue-50 border border-blue-300 hover:bg-blue-100 hover:text-blue-700'
              : 'text-gray-500 bg-white border border-gray-300 hover:bg-blue-50 hover:text-blue-700'
          }`}
          aria-current={page === i ? 'page' : undefined}
        >
          {i}
        </button>,
      );
    }

    // Afficher l'ellipse finale si nécessaire
    if (page < totalPages - 2) {
      items.push(
        <span
          key="ellipsis-end"
          className="hidden sm:flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300"
        >
          ...
        </span>,
      );
    }

    // Toujours afficher la dernière page
    if (page < totalPages - 1 && totalPages > 1) {
      items.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className="hidden sm:flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-blue-50 hover:text-blue-700"
        >
          {totalPages}
        </button>,
      );
    }

    return items;
  };

  return (
    <div className="flex mt-8 justify-center">
      {isChangingPage ? (
        <div className="flex items-center space-x-2 text-gray-600">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
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
          <span>Chargement de la page {page}...</span>
        </div>
      ) : (
        <nav aria-label="Pagination" className="flex items-center">
          <ul className="inline-flex -space-x-px text-sm">
            {/* Bouton page précédente */}
            <li>
              <button
                onClick={() => page > 1 && handlePageChange(page - 1)}
                disabled={page <= 1}
                className={`flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-md ${
                  page <= 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-50 hover:text-blue-700'
                }`}
                aria-label="Page précédente"
              >
                <span className="sr-only">Page précédente</span>
                <svg
                  className="w-2.5 h-2.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 1 1 5l4 4"
                  />
                </svg>
              </button>
            </li>

            {/* Pages numérotées */}
            {getPaginationItems()}

            {/* Bouton page suivante */}
            <li>
              <button
                onClick={() => page < totalPages && handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className={`flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-md ${
                  page >= totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-50 hover:text-blue-700'
                }`}
                aria-label="Page suivante"
              >
                <span className="sr-only">Page suivante</span>
                <svg
                  className="w-2.5 h-2.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
});

CustomPagination.displayName = 'CustomPagination';

export default CustomPagination;
