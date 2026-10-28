/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const turboConfig = require('eslint-config-turbo')

module.exports = {
  root: true,
  ...turboConfig,
  extends: [
    ...(turboConfig.extends || []),
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  plugins: [...(turboConfig.plugins || []), '@typescript-eslint/eslint-plugin'],
  parser: '@typescript-eslint/parser',
  ignorePatterns: [
    '.*.js',
    '*.setup.js',
    '*.config.js',
    '.turbo/',
    'dist/',
    'coverage/',
    'node_modules/',
    '.husky/',
  ],
  rules: {
    'turbo/no-undeclared-env-vars': 'off',
  },
}
