import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestPlugin from 'eslint-plugin-jest';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import importPlugin from 'eslint-plugin-import';
import optimizeRegexPlugin from 'eslint-plugin-optimize-regex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// Créer une configuration qui imite le .eslintrc.js
const eslintConfig = [
  // Inclure les configurations étendues via l'adaptateur de compatibilité
  ...compat.extends(
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'next/core-web-vitals',
    'plugin:jest/recommended',
    'plugin:jest-dom/recommended',
    'plugin:testing-library/react',
    'plugin:react-hooks/recommended',
  ),

  // Appliquer à tous les fichiers JS/JSX
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    // Configurations spécifiques qui complètent celles importées ci-dessus
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      jest: jestPlugin,
      'jest-dom': jestDomPlugin,
      'testing-library': testingLibraryPlugin,
      import: importPlugin,
      'optimize-regex': optimizeRegexPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 0,
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
      'react/prop-types': 'off',
      'no-console':
        process.env.NODE_ENV === 'production'
          ? ['error', { allow: ['warn', 'error'] }]
          : 'off',
      'no-unused-vars':
        process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'jsx-a11y/anchor-is-valid': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'optimize-regex/optimize-regex': 'warn',
      'react/no-array-index-key': 'error',
      'react/forbid-dom-props': ['warn', { forbid: ['style'] }],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
        },
      ],
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [['@', './']],
          extensions: ['.js', '.jsx', '.json'],
        },
      },
      react: {
        version: 'detect',
      },
    },
  },

  // Configuration spécifique pour les fichiers de test
  {
    files: ['**/*.test.js', '**/*.test.jsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];

export default eslintConfig;
