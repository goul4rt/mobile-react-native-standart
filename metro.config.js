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
  /**
   * Um expose por módulo do design (§7): cada um muda por motivo próprio e
   * pode ganhar deploy independente sem tocar nos outros.
   *
   * - questões: sessão e correção, o núcleo do produto
   * - estatísticas: métrica nova ou gráfico diferente não mexe na sessão
   * - conta: isola o risco de LGPD e das regras de loja
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
