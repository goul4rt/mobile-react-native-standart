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
  /**
   * The app is its own host: it publishes these four remotes and, when
   * ZEPHYR_REMOTE points at a published version, loads `stats` back from the
   * edge instead of from its own bundle. That round trip is what makes the
   * federation observable — swap the URL, restart, and a different version of
   * the screen renders with no rebuild.
   *
   * Empty by default, so a normal build stays fully self-contained.
   */
  remotes: process.env.ZEPHYR_REMOTE
    ? { Questiona: `Questiona@${process.env.ZEPHYR_REMOTE}/mf-manifest.json` }
    : {},
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
