module.exports = {
  overrides: [
    {
      files: ['jest.setup.js', '__tests__/**/*.ts'],
      env: { jest: true, node: true },
    },
  ],
  root: true,
  extends: '@react-native',
}
