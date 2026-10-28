/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@sa-marketplace/eslint-config/base.js'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
};
