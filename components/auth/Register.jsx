'use client';

import { useState, useContext, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { debounce } from '@/utils/performance';
import AuthContext from '@/context/AuthContext';
import { registerSchema } from '@/helpers/schemas';
import { LIMITS } from '@/helpers/constants';

// Memoized Input Component for better performance
const FormInput = memo(
  ({
    label,
    type,
    placeholder,
    value,
    onChange,
    name,
    autoComplete,
    required,
    minLength,
    pattern,
    className,
    ariaLabel,
  }) => (
    <div className="mb-4">
      <label htmlFor={name} className="block mb-1 font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`appearance-none border border-gray-200 bg-gray-100 rounded-md py-2 px-3 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full ${className || ''}`}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        pattern={pattern}
        aria-label={ariaLabel || label}
      />
    </div>
  ),
);

FormInput.displayName = 'FormInput';

const Register = () => {
  const { error, registerUser, clearErrors, loading } = useContext(AuthContext);

  // State management
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle context errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearErrors();
      setIsSubmitting(false);
    }
  }, [error, clearErrors]);

  // Reset form when unmounting
  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  // Handle loading state changes
  useEffect(() => {
    if (!loading && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [loading, isSubmitting]);

  // Field validation with debounce
  const validateField = useCallback(
    debounce(async (name, value) => {
      try {
        // Create a temp object with just the field to validate
        const fieldToValidate = { [name]: value };

        // For confirmPassword, we need password too
        if (name === 'confirmPassword') {
          fieldToValidate.password = formData.password;
        }

        // Validate just this field
        await registerSchema.validateAt(name, {
          ...formData,
          ...fieldToValidate,
        });

        // Clear error for this field if validation passes
        setFormErrors((prev) => ({
          ...prev,
          [name]: undefined,
        }));
      } catch (error) {
        // Set error for just this field
        setFormErrors((prev) => ({
          ...prev,
          [name]: error.message,
        }));
      }
    }, 300),
    [formData],
  );

  // Handle input changes
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Validate field after user stops typing
      validateField(name, value);
    },
    [validateField],
  );

  // Form submission
  const submitHandler = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting || loading) return;

    setIsSubmitting(true);

    try {
      // Validate all fields
      await registerSchema.validate(
        {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        },
        { abortEarly: false },
      );

      // Send registration request
      registerUser({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
    } catch (error) {
      setIsSubmitting(false);

      // Handle Yup validation errors
      if (error.inner) {
        const errors = {};
        error.inner.forEach((err) => {
          errors[err.path] = err.message;
        });
        setFormErrors(errors);

        // Show first error in toast
        toast.error(
          error.inner[0]?.message ||
            'Veuillez corriger les erreurs du formulaire',
        );
      } else {
        // Handle other errors
        toast.error(error.message || 'Une erreur est survenue');
      }
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '' };

    let strength = 0;
    if (password.length >= LIMITS.MIN_PASSWORD_LENGTH) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^A-Za-z0-9]/)) strength += 1;

    const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-400',
      'bg-green-600',
    ];

    return {
      strength,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || '',
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="mt-10 mb-20 mx-auto max-w-md p-4 md:p-7 bg-white rounded-md shadow-lg">
      <form onSubmit={submitHandler} noValidate>
        <h2 className="mb-5 text-2xl font-semibold text-gray-800">
          Créer un compte
        </h2>

        <FormInput
          label="Nom complet"
          type="text"
          name="name"
          placeholder="Entrez votre nom"
          value={formData.name}
          onChange={handleChange}
          required
          autoComplete="name"
          className={formErrors.name ? 'border-red-500' : ''}
        />
        {formErrors.name && (
          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
        )}

        <FormInput
          label="Numéro de téléphone"
          type="tel"
          name="phone"
          placeholder="Ex: +33612345678"
          value={formData.phone}
          onChange={handleChange}
          required
          autoComplete="tel"
          className={formErrors.phone ? 'border-red-500' : ''}
        />
        {formErrors.phone && (
          <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
        )}

        <FormInput
          label="Email"
          type="email"
          name="email"
          placeholder="Entrez votre email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          className={formErrors.email ? 'border-red-500' : ''}
        />
        {formErrors.email && (
          <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
        )}

        <FormInput
          label="Mot de passe"
          type="password"
          name="password"
          placeholder="Créez un mot de passe sécurisé"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={LIMITS.MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={formErrors.password ? 'border-red-500' : ''}
        />
        {formData.password && (
          <div className="mb-2">
            <div className="w-full h-2 bg-gray-200 rounded-full mb-1">
              <div
                className={`h-full rounded-full ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              Force: {passwordStrength.label || 'Très faible'}
            </p>
          </div>
        )}
        {formErrors.password && (
          <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
        )}

        <FormInput
          label="Confirmer le mot de passe"
          type="password"
          name="confirmPassword"
          placeholder="Confirmez votre mot de passe"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
          className={formErrors.confirmPassword ? 'border-red-500' : ''}
        />
        {formErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {formErrors.confirmPassword}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || loading}
          className={`my-4 px-4 py-2 cursor-pointer text-center w-full inline-block text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isSubmitting || loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting || loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Inscription en cours...
            </span>
          ) : (
            "S'inscrire"
          )}
        </button>

        <hr className="mt-4" />

        <p className="text-center mt-5">
          Vous avez déjà un compte?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
