/**
 * Filtro em cascata (área → disciplina → tema): cada nível só aparece depois
 * do anterior ser escolhido, e trocar um nível reseta os de baixo.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TopicFilterScreen } from '../src/modules/questions/TopicFilterScreen';
import { PreferencesProvider } from '../src/shared/preferences/PreferencesContext';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

let montada: ReactTestRenderer.ReactTestRenderer | null = null;
afterEach(() => {
  act(() => montada?.unmount());
  montada = null;
});

function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) {
    return `${textOf((node as { children: unknown }).children)} `;
  }
  return '';
}

function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return textOf(tree.toJSON()).replace(/\s+/g, ' ').trim();
}

async function porTestID(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  const [no] = tree.root.findAll(
    (node) => node.props?.testID === id && typeof node.props?.onPress === 'function',
  );
  return no;
}

const taxonomia = {
  areas: [{ code: 'CN', label: 'Ciências da Natureza', total: 40, years: [2023] }],
  skills: [],
  disciplines: [
    { area: 'CN', code: 'biologia', label: 'Biologia', total: 25 },
    { area: 'CN', code: 'fisica', label: 'Física', total: 15 },
  ],
  topics: [
    {
      area: 'CN',
      discipline: 'biologia',
      code: 'genetica-e-hereditariedade',
      label: 'Genética e Hereditariedade',
      total: 10,
    },
    {
      area: 'CN',
      discipline: 'biologia',
      code: 'ecologia-e-meio-ambiente',
      label: 'Ecologia e Meio Ambiente',
      total: 15,
    },
  ],
};

async function render(
  onIniciar: (area: string, discipline: string, topic: string | undefined) => void = () => {},
) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => taxonomia,
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <PreferencesProvider>
        <TopicFilterScreen onIniciar={onIniciar} onVoltar={() => {}} />
      </PreferencesProvider>,
    );
  });
  montada = tree;
  return tree;
}

describe('TopicFilterScreen', () => {
  it('só mostra disciplinas depois de escolher a área, e só as dela', async () => {
    const tree = await render();
    expect(allText(tree)).not.toContain('Biologia');

    const cn = await porTestID(tree, 'area-CN');
    await act(async () => cn.props.onPress());

    const texto = allText(tree);
    expect(texto).toContain('Biologia');
    expect(texto).toContain('Física');
  });

  it('só mostra temas depois de escolher a disciplina, e só os dela, com "todos os temas"', async () => {
    const tree = await render();
    await act(async () => (await porTestID(tree, 'area-CN')).props.onPress());
    await act(async () => (await porTestID(tree, 'discipline-biologia')).props.onPress());

    const texto = allText(tree);
    expect(texto).toContain('Genética e Hereditariedade');
    expect(texto).toContain('Todos os temas');
  });

  it('escolher área, disciplina e tema e confirmar chama onIniciar com os três', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    await act(async () => (await porTestID(tree, 'area-CN')).props.onPress());
    await act(async () => (await porTestID(tree, 'discipline-biologia')).props.onPress());
    await act(async () => (await porTestID(tree, 'topic-genetica-e-hereditariedade')).props.onPress());
    await act(async () => (await porTestID(tree, 'start-session')).props.onPress());

    expect(onIniciar).toHaveBeenCalledWith('CN', 'biologia', 'genetica-e-hereditariedade');
  });

  it('sem escolher tema, confirmar chama onIniciar sem tema (todos)', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    await act(async () => (await porTestID(tree, 'area-CN')).props.onPress());
    await act(async () => (await porTestID(tree, 'discipline-biologia')).props.onPress());
    await act(async () => (await porTestID(tree, 'start-session')).props.onPress());

    expect(onIniciar).toHaveBeenCalledWith('CN', 'biologia', undefined);
  });

  it('sem disciplina escolhida, o botão de iniciar não aparece', async () => {
    const tree = await render();
    await act(async () => (await porTestID(tree, 'area-CN')).props.onPress());

    const iniciar = await porTestID(tree, 'start-session');
    expect(iniciar).toBeUndefined();
  });

  it('offline: explica sem culpar o usuário', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <PreferencesProvider>
          <TopicFilterScreen onIniciar={() => {}} onVoltar={() => {}} />
        </PreferencesProvider>,
      );
    });
    montada = tree;

    expect(allText(tree)).toContain('Sem internet.');
  });
});
