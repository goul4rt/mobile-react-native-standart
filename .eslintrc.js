module.exports = {
  overrides: [
    {
      files: ['jest.setup.js', '__tests__/**/*.ts'],
      env: { jest: true, node: true },
    },
    {
      // Node scripts, not app code: modern ESM, no React Native globals.
      files: ['scripts/**/*.mjs'],
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      env: { node: true, es2022: true },
    },
  ],
  root: true,
  extends: '@react-native',
}
