/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@sa-marketplace/eslint-config/nest.js'],
  parserOptions: {
    // tsconfigRootDir pins resolution to this app, so linting behaves the same from
    // the CLI (cwd = app) and from an editor (cwd = repo root).
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
}
