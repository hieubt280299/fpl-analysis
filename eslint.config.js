import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'functions/lib', 'functions/node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    plugins: { 'react-refresh': reactRefresh },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Domain layer must stay framework-free and side-effect-free.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*'],
              message: 'src/domain must not import React.',
            },
            { group: ['firebase', 'firebase/*'], message: 'src/domain must not import Firebase.' },
            { group: ['@tanstack/*'], message: 'src/domain must not import data-fetching libs.' },
            {
              group: ['@/features/*', '@/lib/*', '@/components/*'],
              message: 'src/domain is the innermost layer.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'functions/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
]);
