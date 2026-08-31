const commands = require('@module-federation/metro-plugin-rnc-cli');
const { updateManifest } = require('@module-federation/metro');
const { zephyrCommandWrapper } = require('zephyr-metro-plugin');

/**
 * The upload to Zephyr does not come from a plain `react-native bundle`:
 * `withZephyr` leaves `customSerializer` null. This command, wrapped by
 * `zephyrCommandWrapper`, is what actually publishes.
 */
const wrappedFuncPromise = zephyrCommandWrapper(
  commands.bundleMFRemoteCommand.func,
  commands.loadMetroConfig,
  () => {
    updateManifest(global.__METRO_FEDERATION_MANIFEST_PATH, global.__METRO_FEDERATION_CONFIG);
  },
);

const zephyrCommand = {
  name: 'bundle-mf-remote',
  description: 'Bundles a Module Federation remote and publishes it to Zephyr',
  func: async (...args) => {
    const wrappedFunc = await wrappedFuncPromise;
    return wrappedFunc(...args);
  },
  options: commands.bundleMFRemoteCommand.options,
};

module.exports = {
  assets: ['./assets/fonts'],
  commands: [zephyrCommand],
};
