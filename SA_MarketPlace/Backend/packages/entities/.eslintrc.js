/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@sa-marketplace/eslint-config/nest.js'],
  parserOptions: {
    // tsconfigRootDir pins this to the package, so type-aware linting resolves the
    // same way from the CLI (cwd = package) and from an editor (cwd = repo root).
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
}
