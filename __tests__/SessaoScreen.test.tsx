/**
 * Os 4 estados da sessão (lendo / acertou / errou / sem comentário) são a tela
 * inteira do app. Sem simulador na mão, é aqui que eles ficam verificados.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SessaoScreen } from '../src/modules/questoes/SessaoScreen';
import type { Question } from '../src/shared/api/client';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

/** O cronômetro roda num setInterval; sem desmontar, ele sobrevive ao teste. */
let montada: ReactTestRenderer.ReactTestRenderer | null = null;
afterEach(() => {
  act(() => montada?.unmount());
  montada = null;
});

const rich = (body: string) => ({ format: 'markdown' as const, body, media: [] });

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'mc_single',
    stem: rich('Qual é a resposta?'),
    supports: [],
    alternatives: [
      { id: 'A', content: rich('errada'), correct: false },
      { id: 'B', content: rich('certa'), correct: true },
    ],
    metadata: { year: 2023, area: 'CH', tags: [] },
    ...overrides,
  };
}

/**
 * Todo o texto renderizado, concatenado. Percorre o JSON em vez de buscar por
 * tipo: no RN 0.87 os componentes vêm embrulhados e `findAllByType(Text)` não
 * casa.
 */
function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  // Sem separador: `{i + 1}/{total}` são três fragmentos de um texto só.
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) {
    return `${textOf((node as { children: unknown }).children)} `;
  }
  return '';
}

function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return textOf(tree.toJSON()).replace(/\s+/g, ' ').trim();
}

async function render(questions: Question[]) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: questions }),
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<SessaoScreen />);
  });
  montada = tree;
  return tree;
}

/** Toca direto na alternativa, como o design manda: sem botão de confirmar. */
async function responder(tree: ReactTestRenderer.ReactTestRenderer, letra: string) {
  const [alternativa] = tree.root.findAll(
    (node) => node.props?.testID === `alternativa-${letra}` && typeof node.props?.onPress === 'function',
  );
  if (!alternativa) throw new Error(`alternativa ${letra} não encontrada`);
  await act(async () => alternativa.props.onPress());
}

/** Toca no botão do rodapé, que só existe depois da resposta. */
async function avancar(tree: ReactTestRenderer.ReactTestRenderer) {
  const botoes = tree.root.findAll(
    (node) => typeof node.props?.onPress === 'function' && node.props?.testID === undefined,
  );
  const proxima = botoes[botoes.length - 1];
  await act(async () => proxima.props.onPress());
}

describe('SessaoScreen', () => {
  it('lendo: mostra progresso, meta e alternativas, sem feedback', async () => {
    const tree = await render([question()]);
    const texto = allText(tree);

    expect(texto).toContain('1/1');
    expect(texto).toContain('ENEM 2023');
    expect(texto).toContain('Ciências Humanas');
    expect(texto).toContain('Qual é a resposta?');
    expect(texto).not.toContain('Boa!');
    expect(texto).not.toContain('Quase.');
  });

  it('acertou: elogia e revela o gabarito', async () => {
    const tree = await render([question({ explanation: rich('Porque sim.') })]);
    await responder(tree, 'B');

    const texto = allText(tree);
    expect(texto).toContain('Boa! Essa você domina.');
    expect(texto).toContain('Gabarito comentado');
    expect(texto).toContain('Porque sim.');
  });

  it('errou: aponta a alternativa correta sem drama', async () => {
    const tree = await render([question({ explanation: rich('Porque sim.') })]);
    await responder(tree, 'A');

    const texto = allText(tree);
    expect(texto).toContain('Quase. A certa era a B');
    expect(texto).not.toContain('Boa! Essa você domina.');
  });

  it('sem comentário: nunca deixa a tela vazia, informa o gabarito oficial', async () => {
    const tree = await render([question()]);
    await responder(tree, 'A');

    const texto = allText(tree);
    expect(texto).toContain('Gabarito comentado');
    expect(texto).toContain('ainda não tem comentário');
    expect(texto).toContain('alternativa B');
  });

  it('fim da sessão: conta acertos e erros do que foi respondido', async () => {
    const tree = await render([
      question({ id: '11111111-1111-4111-8111-111111111111' }),
      question({ id: '22222222-2222-4222-8222-222222222222' }),
    ]);

    await responder(tree, 'B'); // acerta
    await avancar(tree);
    await responder(tree, 'A'); // erra
    await avancar(tree);

    const texto = allText(tree);
    expect(texto).toContain('Fim da sessão');
    expect(texto).toContain('1 acertos');
    expect(texto).toContain('1 erros');
    // Sem amostra da população, o cartão explica em vez de inventar número.
    expect(texto).toContain('Ainda faltam respostas de outros alunos');
  });

  it('offline: explica sem culpar o usuário', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<SessaoScreen />);
    });
    montada = tree;

    expect(allText(tree)).toContain('Sem internet.');
  });
});
