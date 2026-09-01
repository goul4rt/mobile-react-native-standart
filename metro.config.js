const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withModuleFederation } = require('@module-federation/metro');
const { withZephyr } = require('zephyr-metro-plugin');

const pkg = require('./package.json');


const mfConfig = {
  name: 'Questiona',
  filename: 'Questiona.bundle',
  /**
   * One expose per domain module:
   * - questions: the session and grading, the core of the product
   * - stats: a new metric or a different chart never touches the session
   * - account: isolates data-protection and store-policy risk
   */
  exposes: {
    './session': './src/modules/questions/SessionScreen.tsx',
    './home': './src/modules/questions/HomeScreen.tsx',
    './stats': './src/modules/stats/StatsScreen.tsx',
    './profile': './src/modules/account/ProfileScreen.tsx',
  },
  shared: {
    react: {
      singleton: true,
      eager: false,
      requiredVersion: pkg.dependencies.react,
      version: pkg.dependencies.react,
      import: false,
    },
    'react-native': {
      singleton: true,
      eager: false,
      requiredVersion: pkg.dependencies['react-native'],
      version: pkg.dependencies['react-native'],
      import: false,
    },
  },
  shareStrategy: 'version-first',
};

const isPublish = Boolean(process.env.PLATFORM);

module.exports = (async () => {
  const baseConfig = mergeConfig(getDefaultConfig(__dirname), {});
  if (!isPublish) return baseConfig;

  const zephyrConfig = await withZephyr({
    name: mfConfig.name,
    target: process.env.PLATFORM === 'android' ? 'android' : 'ios',
  })(baseConfig);

  return withModuleFederation(zephyrConfig, mfConfig, {
    flags: {
      unstable_patchHMRClient: true,
      unstable_patchInitializeCore: true,
      unstable_patchRuntimeRequire: true,
    },
  });
})();
