import React from 'react';
import dynamic from 'next/dynamic';
import Loading from '@/app/loading';

const Register = dynamic(() => import('@/components/auth/Register'), {
  loading: () => <Loading />,
});

const RegisterPage = () => {
  return <Register />;
};

export default RegisterPage;