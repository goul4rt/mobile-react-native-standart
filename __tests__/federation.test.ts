import { readFileSync } from 'node:fs';

/**
 * O consumo do remote é a única parte da federação que o app em execução
 * demonstra. Se ela quebrar, tudo continua verde: as telas renderizam do bundle
 * local e ninguém percebe até abrir a aba na frente de alguém.
 */
describe('consumo de remotes', () => {
  const metro = readFileSync('metro.config.js', 'utf8');
  const wrapper = readFileSync('src/shared/federation/remoteStats.tsx', 'utf8');
  const runtime = readFileSync('src/shared/federation/remote.ts', 'utf8');

  it('o expose de stats aponta para a tela, não para o carregador', () => {
    // Apontar o expose para o wrapper faria o remote carregar o próprio
    // carregador, que carregaria o remote, indefinidamente.
    expect(metro).toContain("'./stats': './src/modules/stats/StatsScreen.tsx'");
    expect(metro).not.toContain('federation/remoteStats');
  });

  it('a navegação usa o carregador, senão o remote nunca é consultado', () => {
    const nav = readFileSync('src/navigation.tsx', 'utf8');
    expect(nav).toContain("from './shared/federation/remoteStats'");
  });

  it('o nome do remote bate com o name do manifesto publicado', () => {
    // mf-manifest.json publica `"name": "Questiona"`; registrar com outro nome
    // faz loadRemote falhar e cair no bundle local sem erro visível.
    const nomeNoManifesto = /name:\s*'([^']+)'/.exec(metro)?.[1];
    expect(nomeNoManifesto).toBe('Questiona');
    expect(runtime).toContain("const REMOTE_NAME = 'Questiona'");
  });

  it('falha de rede cai no bundle local em vez de derrubar a tela', () => {
    expect(wrapper).toContain('BundledStatsScreen');
    expect(wrapper).toMatch(/catch\s*(\(\w+\))?\s*\{[\s\S]*?setOrigin\('bundled'\)/);
  });

  it('a origem fica visível na tela', () => {
    // Sem o banner, uma tela remota e uma local são indistinguíveis — e a
    // demonstração inteira depende de a diferença ser visível.
    expect(wrapper).toContain('Zephyr edge');
    expect(wrapper).toContain('from this bundle');
  });
});
