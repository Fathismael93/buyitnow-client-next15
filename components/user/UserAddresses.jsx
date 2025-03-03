/* eslint-disable react/prop-types */
import { arrayHasData } from '@/helpers/helpers';
import Link from 'next/link';
import React, { memo } from 'react';

const UserAddresses = memo(({ addresses }) => {
  return arrayHasData(addresses) ? (
    <div className="w-full">
      <p className="font-bold text-xl text-center">No address found!</p>
    </div>
  ) : (
    addresses?.map((address) => (
      <Link href={`/address/${address._id}`} key={address._id}>
        <div className="mb-5 gap-4">
          <figure className="w-full flex align-center bg-gray-100 hover:bg-blue-100 p-4 rounded-md cursor-pointer">
            <div className="mr-3">
              <span className="flex items-center justify-center text-yellow-500 w-12 h-12 bg-white rounded-full shadow-sm mt-2">
                <i className="fa fa-map-marker-alt"></i>
              </span>
            </div>
            <figcaption className="text-gray-600">
              <p>
                {address.street} <br /> {address.city}, {address.state},{' '}
                {address.zipCode}, {address.country}
                <br />
                Phone no: {address.phoneNo}
              </p>
            </figcaption>
          </figure>
        </div>
      </Link>
    ))
  );
});

UserAddresses.displayName = 'UserAddresses';

export default UserAddresses;
