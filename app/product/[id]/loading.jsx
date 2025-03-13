import React from 'react';

const ProductLoading = () => {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumbs skeleton */}
      <div className="animate-pulse mb-6">
        <div className="h-8 bg-gray-200 rounded-md w-3/4 max-w-md"></div>
      </div>

      {/* Product main section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product image skeleton */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg bg-gray-100 h-80 md:h-96"></div>
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded-md"></div>
            ))}
          </div>
        </div>

        {/* Product details skeleton */}
        <div className="space-y-6">
          {/* Title */}
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-md w-3/4 mb-3"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            </div>
          </div>

          {/* Price section */}
          <div className="py-4 border-t border-b border-gray-200">
            <div className="h-10 bg-gray-200 rounded-md w-1/3"></div>
          </div>

          {/* Description */}
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded-md w-1/4 mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-full"></div>
              <div className="h-4 bg-gray-200 rounded-md w-full"></div>
              <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
            </div>
          </div>

          {/* Add to cart section */}
          <div className="pt-4 animate-pulse">
            <div className="mb-4">
              <div className="h-5 bg-gray-200 rounded-md w-1/5 mb-2"></div>
              <div className="w-32 h-10 bg-gray-200 rounded-md"></div>
            </div>
            <div className="h-12 bg-gray-200 rounded-md w-full md:w-48"></div>
          </div>
        </div>
      </div>

      {/* Related products skeleton */}
      <div className="mt-16 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
            >
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-3"></div>
                <div className="h-6 bg-gray-200 rounded-md w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductLoading;
