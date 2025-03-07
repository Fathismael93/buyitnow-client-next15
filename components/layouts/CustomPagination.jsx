/* eslint-disable react/prop-types */
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import React, { memo, useEffect, useState } from 'react';
import ResponsivePaginationComponent from 'react-responsive-pagination';
import 'react-responsive-pagination/themes/classic.css';

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
        <ResponsivePaginationComponent
          current={page}
          total={totalPages}
          onPageChange={handlePageChange}
          maxWidth={300}
          className="responsive-pagination"
          ariaPreviousLabel="Page précédente"
          ariaNextLabel="Page suivante"
          previousLabel="«"
          nextLabel="»"
        />
      )}
    </div>
  );
});

CustomPagination.displayName = 'CustomPagination';

export default CustomPagination;
