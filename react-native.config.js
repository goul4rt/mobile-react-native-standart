const commands = require('@module-federation/metro-plugin-rnc-cli');
const { updateManifest } = require('@module-federation/metro');
const { zephyrCommandWrapper } = require('zephyr-metro-plugin');

/**
 * O upload pro Zephyr não sai do `react-native bundle` comum: nem `withZephyr`
 * nem `withModuleFederation` instalam serializer (`customSerializer` fica
 * null). Quem publica é este comando, embrulhado pelo `zephyrCommandWrapper`.
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
  description: 'Bundles a Module Federation remote e publica no Zephyr',
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
