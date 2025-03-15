import { Suspense, lazy } from 'react';
import Loading from '@/app/loading';

// Utilisation de React.lazy au lieu de next/dynamic
const Register = lazy(() => import('@/components/auth/Register'));

// Métadonnées optimisées pour SEO
export const metadata = {
  title: 'Créer un compte | Buy It Now',
  description:
    'Inscrivez-vous pour accéder à des milliers de produits. Créez votre compte Buy It Now en quelques étapes simples.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Créer un compte | Buy It Now',
    description:
      'Inscrivez-vous pour accéder à des milliers de produits. Créez votre compte Buy It Now en quelques étapes simples.',
    type: 'website',
  },
};

// Garder la directive force-dynamic
export const dynamic = 'force-dynamic';

const RegisterPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-md">
        <Suspense fallback={<Loading />}>
          <Register />
        </Suspense>
      </div>
    </div>
  );
};

export default RegisterPage;
