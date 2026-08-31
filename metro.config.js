const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withModuleFederation } = require('@module-federation/metro');
const { withZephyr } = require('zephyr-metro-plugin');

const pkg = require('./package.json');

/**
 * Zephyr does not replace Metro: it wraps Metro's config and uploads the
 * resulting bundle. But `withZephyr` on its own installs
 * `customSerializer: null`. What produces the artifact Zephyr publishes is
 * `withModuleFederation`. Without it the build runs, authenticates, and
 * uploads nothing.
 */
const mfConfig = {
  name: 'Questiona',
  filename: 'Questiona.bundle',
  /**
   * One expose per domain module:
   *
   * - questions: the session and grading, the core of the product
   * - stats: a new metric or a different chart never touches the session
   * - account: isolates data-protection and store-policy risk
   */
  exposes: {
    './sessao': './src/modules/questoes/SessaoScreen.tsx',
    './home': './src/modules/questoes/HomeScreen.tsx',
    './estatisticas': './src/modules/estatisticas/EstatisticasScreen.tsx',
    './perfil': './src/modules/conta/PerfilScreen.tsx',
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

module.exports = (async () => {
  const baseConfig = mergeConfig(getDefaultConfig(__dirname), {});
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
