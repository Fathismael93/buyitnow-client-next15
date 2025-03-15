'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'react-toastify';
import { parseCallbackUrl } from '@/helpers/helpers';
import { loginSchema } from '@/helpers/schemas';
import { startTimer } from '@/monitoring/sentry';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [focusedField, setFocusedField] = useState(null);

  const router = useRouter();
  const params = useSearchParams();
  const callBackUrl = params.get('callbackUrl');

  const MAX_LOGIN_ATTEMPTS = 5;
  const MAX_RETRY_ATTEMPTS = 3;

  // Réinitialiser les tentatives de connexion après un certain temps
  useEffect(() => {
    if (loginAttempts > 0) {
      const timer = setTimeout(
        () => {
          setLoginAttempts(0);
        },
        30 * 60 * 1000,
      ); // 30 minutes

      return () => clearTimeout(timer);
    }
  }, [loginAttempts]);

  const submitHandler = async (e) => {
    e.preventDefault();

    // Démarrer un timer pour mesurer la performance
    const endTimer = startTimer('login.submit');

    try {
      // Vérifier si trop de tentatives
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        toast.error(
          'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
        );
        endTimer({ success: false, blocked: true });
        return;
      }

      setIsSubmitting(true);

      // Valider les données du formulaire
      const result = await loginSchema.validate({ email, password });

      if (result) {
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          toast.error(
            'Service temporairement indisponible. Veuillez réessayer plus tard.',
          );
          Sentry.captureMessage('Login max retry attempts reached', {
            level: 'error',
            tags: { component: 'Login' },
          });
          return;
        }

        // Tenter de se connecter
        const data = await signIn('credentials', {
          email,
          password,
          callbackUrl: callBackUrl ? parseCallbackUrl(callBackUrl) : '/',
          redirect: false,
        }).catch((error) => {
          setRetryCount((prev) => prev + 1);
          throw error;
        });

        // Réinitialiser le compteur de tentatives si réussi
        setRetryCount(0);

        if (data?.error) {
          setLoginAttempts((prev) => prev + 1);
          Sentry.captureMessage('Login failed', {
            level: 'warning',
            tags: { action: 'login_attempt' },
            extra: {
              error: data.error,
              emailDomain: email.split('@')[1] || 'unknown',
              attempts: loginAttempts + 1,
            },
          });
          toast.error(data?.error);
        }

        if (data?.ok) {
          // Reset des tentatives après une connexion réussie
          setLoginAttempts(0);
          toast.success('Connexion réussie');
          router.push(data?.url || '/');
        }
      }
    } catch (error) {
      // Gestion des erreurs de validation et autres
      toast.error(error.message || 'Une erreur est survenue');
      Sentry.captureException(error, {
        tags: { component: 'Login', action: 'form_submission' },
        extra: {
          emailProvided: !!email,
          passwordProvided: !!password,
          validationError: error.name === 'ValidationError',
        },
      });
    } finally {
      setIsSubmitting(false);
      endTimer({
        success: !error,
        attempts: loginAttempts,
      });
    }
  };

  return (
    <div
      style={{ maxWidth: '480px' }}
      className="mt-10 mb-20 p-4 md:p-7 mx-auto rounded-sm bg-white shadow-lg"
    >
      <form
        onSubmit={submitHandler}
        data-testid="login-form"
        aria-labelledby="login-heading"
      >
        <h2
          id="login-heading"
          className="mb-5 text-2xl font-semibold"
          data-testid="login-heading"
        >
          Connexion
        </h2>

        <div className="mb-4">
          <label htmlFor="email" className="block mb-1 font-medium">
            Adresse e-mail{' '}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatoire)</span>
          </label>
          <input
            id="email"
            data-testid="login-email-input"
            className={`appearance-none border ${
              focusedField === 'email' ? 'border-blue-400' : 'border-gray-200'
            } bg-gray-100 rounded-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full`}
            type="email"
            placeholder="Entrez votre adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            aria-required="true"
            disabled={isSubmitting || loginAttempts >= MAX_LOGIN_ATTEMPTS}
            required
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label htmlFor="password" className="font-medium">
              Mot de passe{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(obligatoire)</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Mot de passe oublié?
            </Link>
          </div>
          <input
            id="password"
            data-testid="login-password-input"
            className={`appearance-none border ${
              focusedField === 'password'
                ? 'border-blue-400'
                : 'border-gray-200'
            } bg-gray-100 rounded-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full`}
            type="password"
            placeholder="Entrez votre mot de passe"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            aria-required="true"
            disabled={isSubmitting || loginAttempts >= MAX_LOGIN_ATTEMPTS}
            required
          />
        </div>

        <button
          type="submit"
          data-testid="login-submit-button"
          className={`my-2 px-4 py-2 text-center w-full inline-block text-white ${
            isSubmitting || loginAttempts >= MAX_LOGIN_ATTEMPTS
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
          disabled={isSubmitting || loginAttempts >= MAX_LOGIN_ATTEMPTS}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        {loginAttempts > 0 && (
          <p className="mt-2 text-sm text-amber-600">
            {`Tentative ${loginAttempts}/${MAX_LOGIN_ATTEMPTS}`}
          </p>
        )}

        <hr className="mt-4" />

        <p className="text-center mt-5">
          Vous n'avez pas de compte?{' '}
          <Link
            href="/register"
            className="text-blue-800 font-semibold hover:underline"
          >
            S'inscrire
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
