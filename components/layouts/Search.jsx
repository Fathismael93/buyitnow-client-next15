'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { searchSchema } from '@/helpers/schemas';
import { debounce } from 'lodash';

// eslint-disable-next-line react/prop-types
const Search = ({ setLoading }) => {
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get('keyword') || '';
  const [keyword, setKeyword] = useState(initialKeyword);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  const router = useRouter();

  // Debounce la recherche pour éviter trop de requêtes lors de la frappe rapide
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      if (searchTerm.trim()) {
        router.push(`/?keyword=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        router.push('/');
      }
      setIsSearching(false);
    }, 700),
    [router],
  );

  const handleInputChange = (e) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);

    if (newKeyword.trim().length > 2) {
      setIsSearching(true);
      debouncedSearch(newKeyword);
    } else if (newKeyword.trim() === '') {
      setIsSearching(true);
      debouncedSearch('');
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsSearching(true);

    try {
      const result = await searchSchema.validate(
        { keyword },
        { abortEarly: false },
      );

      if (result.keyword) {
        router.push(`/?keyword=${encodeURIComponent(keyword.trim())}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Utilisé pour effacer la recherche
  const clearSearch = () => {
    setKeyword('');
    router.push('/');
    inputRef.current?.focus();
  };

  return (
    <form
      className="flex flex-nowrap items-center w-full relative"
      onSubmit={submitHandler}
    >
      <input
        ref={inputRef}
        className="grow appearance-none border border-gray-200 bg-gray-100 rounded-l-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
        type="text"
        placeholder="Rechercher un produit..."
        value={keyword}
        onChange={handleInputChange}
        aria-label="Recherche"
      />

      {/* Bouton pour effacer la recherche - visible uniquement quand il y a du texte */}
      {keyword && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-14 text-gray-400 hover:text-gray-600"
          aria-label="Effacer la recherche"
        >
          <i className="fa fa-times"></i>
        </button>
      )}

      <button
        type="submit"
        className="px-4 py-2 cursor-pointer inline-block border border-transparent bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
        disabled={isSearching}
      >
        {isSearching ? (
          <i className="fa fa-spinner fa-spin"></i>
        ) : (
          <i className="fa fa-search"></i>
        )}
      </button>

      {/* Indicateur de recherche en cours */}
      {isSearching && keyword.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-md rounded-md p-2 text-sm text-gray-600 border border-gray-200">
          Recherche en cours...
        </div>
      )}
    </form>
  );
};

export default Search;
