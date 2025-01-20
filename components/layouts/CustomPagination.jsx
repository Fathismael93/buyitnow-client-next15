'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { memo } from 'react';
import Pagination from 'react-js-pagination';
import ResponsivePaginationComponent from 'react-responsive-pagination';
import 'react-responsive-pagination/themes/classic.css';

const CustomPagination = memo(({ resPerPage, productsCount }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = productsCount / resPerPage;

  let page = searchParams.get('page') || 1;
  page = Number(page);

  let queryParams;

  const handlePageChange = (currentPage) => {
    if (typeof window !== 'undefined') {
      queryParams = new URLSearchParams(window.location.search);

      if (queryParams.has('page')) {
        queryParams.set('page', currentPage);
      } else {
        queryParams.append('page', currentPage);
      }

      const path = window.location.pathname + '?' + queryParams.toString();
      router.push(path);
    }
  };

  return (
    <div className="flex mt-20 justify-center">
      {/* <Pagination
        activePage={page}
        itemsCountPerPage={resPerPage}
        totalItemsCount={productsCount}
        onChange={handlePageChange}
        nextPageText={'Next'}
        prevPageText={'Prev'}
        firstPageText={'First'}
        lastPageText={'Last'}
        itemClass="relative inline-flex items-center border border-gray-300 bg-white px-2 py-1 md:px-4 md:py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
        activeLinkClassName="z-10 inline-flex items-center border border-indigo-500 bg-indigo-50 text-sm font-medium text-indigo-600 focus:z-20"
        activeClass="z-10 inline-flex items-center border border-indigo-500 bg-indigo-50 text-sm font-medium text-indigo-600 focus:z-20"
      /> */}
      <ResponsivePaginationComponent
        current={page}
        total={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
});

export default CustomPagination;
