export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'valid-typeof': 'error',
      'constructor-super': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2015,
      globals: { window: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
