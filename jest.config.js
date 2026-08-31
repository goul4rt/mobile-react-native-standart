module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // react-navigation, async-storage e svg publicam ESM: sem isto o Jest recebe
  // `export` cru e falha ao parsear.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|@react-native-async-storage)/)',
  ],
};
