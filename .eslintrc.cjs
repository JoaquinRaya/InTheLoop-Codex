module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.base.json']
  },
  plugins: ['functional', '@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'functional/no-let': 'error',
    'functional/immutable-data': 'error',
    'functional/prefer-readonly-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error'
  },
  ignorePatterns: ['dist/**', '**/dist/**', 'coverage/**']
};
