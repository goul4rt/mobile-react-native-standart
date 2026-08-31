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
    tree = ReactTestRenderer.create(<SessaoScreen area="CH" onSair={() => {}} />);
  });
  montada = tree;
  return tree;
}

async function porTestID(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  const [no] = tree.root.findAll(
    (node) => node.props?.testID === id && typeof node.props?.onPress === 'function',
  );
  return no;
}

/** Marca a alternativa e envia: dois passos, como o rodapé exige. */
async function responder(tree: ReactTestRenderer.ReactTestRenderer, letra: string) {
  const alternativa = await porTestID(tree, `alternativa-${letra}`);
  if (!alternativa) throw new Error(`alternativa ${letra} não encontrada`);
  await act(async () => alternativa.props.onPress());

  const enviar = await porTestID(tree, 'responder');
  if (!enviar) throw new Error('botão Responder não apareceu após marcar');
  await act(async () => enviar.props.onPress());
}

/** Toca no botão do rodapé, que só existe depois da resposta. */
async function avancar(tree: ReactTestRenderer.ReactTestRenderer) {
  const proxima = await porTestID(tree, 'proxima');
  if (!proxima) throw new Error('botão de avançar não encontrado');
  await act(async () => proxima.props.onPress());
}

describe('SessaoScreen', () => {
  it('lendo: mostra progresso, meta e alternativas, sem feedback nem rodapé', async () => {
    const tree = await render([question()]);
    const texto = allText(tree);

    expect(await porTestID(tree, 'responder')).toBeUndefined();
    expect(texto).toContain('1/1');
    expect(texto).toContain('ENEM 2023');
    expect(texto).toContain('Ciências Humanas');
    expect(texto).toContain('Qual é a resposta?');
    expect(texto).not.toContain('Boa!');
    expect(texto).not.toContain('Quase.');
  });

  it('marcar não responde: o gabarito só aparece depois de enviar', async () => {
    const tree = await render([question({ explanation: rich('Porque sim.') })]);

    const alternativa = await porTestID(tree, 'alternativa-B');
    await act(async () => alternativa.props.onPress());

    // Marcada: o rodapé aparece, mas nada de gabarito ainda.
    expect(await porTestID(tree, 'responder')).toBeDefined();
    const texto = allText(tree);
    expect(texto).toContain('Responder');
    expect(texto).not.toContain('Boa! Essa você domina.');
    expect(texto).not.toContain('Gabarito comentado');
  });

  it('dá pra trocar de ideia antes de enviar', async () => {
    const tree = await render([question({ explanation: rich('Porque sim.') })]);

    const errada = await porTestID(tree, 'alternativa-A');
    await act(async () => errada.props.onPress());
    const certa = await porTestID(tree, 'alternativa-B');
    await act(async () => certa.props.onPress());
    const enviar = await porTestID(tree, 'responder');
    await act(async () => enviar.props.onPress());

    // Vale a última marcação, não a primeira.
    expect(allText(tree)).toContain('Boa! Essa você domina.');
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
      tree = ReactTestRenderer.create(<SessaoScreen area="CH" onSair={() => {}} />);
    });
    montada = tree;

    expect(allText(tree)).toContain('Sem internet.');
  });
});

describe('RichText', () => {
  it('renderiza negrito, itálico e link sem mostrar a sintaxe', async () => {
    const tree = await render([
      question({
        stem: rich(
          'Um **negrito**, um *itálico* e uma fonte: [www.exemplo.gov.br](http://www.exemplo.gov.br/).',
        ),
      }),
    ]);

    // allText separa nós com espaço, então normaliza antes de comparar.
    const texto = allText(tree).replace(/\s+([,.])/g, '$1');
    expect(texto).toContain('Um negrito, um itálico e uma fonte: www.exemplo.gov.br.');
    expect(texto).not.toContain('**');
    expect(texto).not.toContain('](http');
  });

  it('junta hard wrap em parágrafo e separa por linha em branco', async () => {
    const tree = await render([
      question({ stem: rich('Primeira linha\nsegunda linha.\n\nOutro parágrafo.') }),
    ]);

    const texto = allText(tree);
    expect(texto).toContain('Primeira linha segunda linha.');
    expect(texto).toContain('Outro parágrafo.');
  });
});
