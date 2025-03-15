import dynamic from 'next/dynamic';
import Loading from '@/app/loading';

// Utilisation de l'import dynamique pour le composant
const Register = dynamic(() => import('@/components/auth/Register'), {
  loading: () => <Loading />,
});

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

// Configuration du comportement dynamique de la page
export const dynamic = 'force-dynamic';

const RegisterPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-md">
        <Register />
      </div>
    </div>
  );
};

export default RegisterPage;
