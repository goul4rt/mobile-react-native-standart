const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withZephyr } = require('zephyr-metro-plugin');

/**
 * Zephyr entra como um wrapper em volta do config do Metro: o bundle continua
 * sendo gerado pelo Metro, e o plugin sobe o resultado pro Zephyr Cloud.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = (async () => {
  const baseConfig = mergeConfig(getDefaultConfig(__dirname), config);
  const zephyrConfig = await withZephyr({
    name: 'Gabarita',
    target: process.env.PLATFORM === 'android' ? 'android' : 'ios',
  })(baseConfig);

  return mergeConfig(baseConfig, zephyrConfig);
})();
