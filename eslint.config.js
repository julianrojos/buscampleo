import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SERVER_ONLY_IMPORT_MESSAGE =
  'Use browser-safe APIs in src/. Move server-only logic to a backend service or a tool script.';

const SERVER_ONLY_IMPORTS = [
  '@anthropic-ai/sdk',
  'pdf-parse',
  'resend',
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'module',
  'net',
  'node:*',
  'os',
  'path',
  'perf_hooks',
  'readline',
  'stream',
  'tls',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'package-lock.json', '.agents/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Tooling/config files get Node globals.
    files: [
      'eslint.config.js',
      'vite.config.{js,mjs,cjs,ts}',
      '**/*.config.{js,mjs,cjs,ts}',
      'scripts/**/*.{js,mjs,cjs,ts}',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: SERVER_ONLY_IMPORTS.map((name) => ({
            name,
            message: SERVER_ONLY_IMPORT_MESSAGE,
          })),
          patterns: [
            {
              group: ['node:*'],
              message: SERVER_ONLY_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactRefresh.configs.vite,
    rules: {
      ...reactRefresh.configs.vite.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  eslintConfigPrettier,
);
