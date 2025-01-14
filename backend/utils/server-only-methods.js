import 'server-only';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import axios from 'axios';
import mongoose from 'mongoose';
import queryString from 'query-string';
import * as Sentry from '@sentry/nextjs';
import { getCookieName } from '@/helpers/helpers';

export const getAllProducts = async (searchParams) => {
  const urlParams = {
    keyword: (await searchParams).keyword,
    page: (await searchParams).page,
    category: (await searchParams).category,
    'price[gte]': (await searchParams).min,
    'price[lte]': (await searchParams).max,
    'ratings[gte]': (await searchParams).ratings,
  };

  const searchQuery = queryString.stringify(urlParams);

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/products?${searchQuery}`,
  );

  return data;
};

export const getProductDetails = async (id) => {
  const isValidId = mongoose.isValidObjectId(id);

  if (id === undefined || id === null || !isValidId) {
    return notFound();
  }

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`,
  );

  if (data === undefined) {
    return notFound();
  }

  return data;
};

export const getAllAddresses = async (page) => {
  try {
    const nextCookies = await cookies();
    const nextAuthSessionToken = nextCookies.get(
      '__Secure-next-auth.session-token',
    );

    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/address`,
      {
        headers: {
          Cookie: `${nextAuthSessionToken?.name}=${nextAuthSessionToken?.value}`,
        },
      },
    );

    Sentry.captureConsoleIntegration();

    if (page === 'profile') {
      delete data?.paymentTypes;
    }

    return data;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getSingleAddress = async (id) => {
  if (id === undefined || id === null) {
    return notFound();
  }

  const nextCookies = await cookies();

  const cookieName = getCookieName();
  const nextAuthSessionToken = nextCookies.get(cookieName);

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/address/${id}`,
    {
      headers: {
        Cookie: `${nextAuthSessionToken?.name}=${nextAuthSessionToken?.value}`,
      },
    },
  );

  if (data === undefined) {
    return notFound();
  }

  return data?.address;
};

export const getAllOrders = async (searchParams) => {
  const nextCookies = await cookies();

  const nextAuthSessionToken = nextCookies.get(
    '__Secure-next-auth.session-token',
  );

  const urlParams = {
    page: (await searchParams)?.page || 1,
  };

  const searchQuery = queryString.stringify(urlParams);

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/orders/me?${searchQuery}`,
    {
      headers: {
        Cookie: `${nextAuthSessionToken?.name}=${nextAuthSessionToken?.value}`,
      },
    },
  );

  return data;
};
