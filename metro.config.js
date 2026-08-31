const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withModuleFederation } = require('@module-federation/metro');
const { withZephyr } = require('zephyr-metro-plugin');

const pkg = require('./package.json');

/**
 * Zephyr não substitui o Metro: embrulha o config dele e sobe o bundle
 * resultante. Mas `withZephyr` sozinho instala `customSerializer: null` — quem
 * gera o artefato que o Zephyr publica é o `withModuleFederation`. Sem ele o
 * build roda, autentica e não sobe nada.
 */
const mfConfig = {
  name: 'Gabarita',
  filename: 'Gabarita.bundle',
  // A sessão de questões é o módulo que o design prevê como `mf-questoes`.
  // Expor já agora mantém a fronteira honesta: o que é federável fica visível.
  exposes: {
    './sessao': './src/modules/questoes/SessaoScreen.tsx',
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
