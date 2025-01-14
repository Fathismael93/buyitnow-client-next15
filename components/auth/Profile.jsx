'use client';

import AuthContext from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import Loading from '@/app/loading';

import Link from 'next/link';
import React, { useContext } from 'react';

const UserAddresses = dynamic(() => import('@/components/users/UserAddresses'), {
  loading: () => <Loading />,
});

const Profile = ({ addresses }) => {
  const { user } = useContext(AuthContext);

  return (
    <>
      <figure className="flex items-start sm:items-center">
        <div className="relative mr-3">
          <img
            className="w-10 h-10 rounded-full mr-4"
            src={user?.avatar ? user?.avatar?.url : '/images/default.png'}
            alt={user?.name}
          />
        </div>
        <figcaption className="text:xs md:text-sm">
          <p>
            <b>Email: </b> {user?.email} | <b>Mobile: </b> {user?.phone}
          </p>
        </figcaption>
      </figure>

      <hr className="my-4" />

      <UserAddresses addresses={addresses} />

      <hr className="my-4" />
      <div className="flex items-start gap-x-2">
        <Link href="/address/new">
          <button className="px-4 inline-block text-sm text-green-600 rounded-md hover:bg-gray-100">
            <i className="mr-1 fa fa-plus"></i> Address
          </button>
        </Link>
        <Link href="/me/update">
          <button className="px-4 inline-block text-sm text-orange-600 rounded-md hover:bg-gray-100">
            <i className="mr-1 fa fa-pencil"></i> Profile
          </button>
        </Link>
        <Link href="/me/update_password">
          <button className="px-4 inline-block text-sm text-blue-600 rounded-md hover:bg-gray-100">
            <i className="mr-1 fa fa-pencil"></i> Mot de passe
          </button>
        </Link>
      </div>
    </>
  );
};

export default Profile;