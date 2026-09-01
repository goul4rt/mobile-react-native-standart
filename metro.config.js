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

/**
 * `PLATFORM` só existe nos scripts de build (`deploy:ios`/`deploy:android`), e
 * é assim que distinguimos publicação de desenvolvimento.
 *
 * Module Federation entra apenas na publicação. No Metro dev server ele quebra
 * a inicialização do RN 0.87: `unstable_patchInitializeCore` injeta
 * `require('mf:init-host')` logo após o 'use strict' do InitializeCore, antes de
 * `setUpDefaltReactNativeEnvironment` criar o ErrorUtils global, e o app morre
 * em "cannot read property 'setGlobalHandler' of undefined". Desligar a flag
 * troca o erro por "Invalid loadShareSync call" (RUNTIME-006), porque aí o host
 * federado nunca inicializa. As duas pontas quebram, então o dev server roda
 * Metro puro — o que não custa nada, já que o app não consome remotes: os
 * quatro exposes existem para serem publicados, não para serem carregados aqui.
 */
const publicando = Boolean(process.env.PLATFORM);

module.exports = (async () => {
  const baseConfig = mergeConfig(getDefaultConfig(__dirname), {});
  if (!publicando) return baseConfig;

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
