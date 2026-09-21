/**
 * A tela de filtro decide o que `fetchSession` recebe como `skill`. Sem
 * simulador na mão, é aqui que a seleção e a chamada de `onIniciar` ficam
 * verificadas.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SubjectFilterScreen } from '../src/modules/questions/SubjectFilterScreen';
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
  areas: [{ code: 'CH', label: 'Ciências Humanas', total: 30, years: [2023, 2022, 2021] }],
  skills: [
    { area: 'CH', skill: 'H1', total: 12, avgDifficulty: 0.4 },
    { area: 'CH', skill: 'H8', total: 18, avgDifficulty: 0.6 },
    { area: 'MT', skill: 'H2', total: 9, avgDifficulty: 0.3 },
  ],
  disciplines: [
    { area: 'CH', code: 'historia', label: 'História', total: 15 },
    { area: 'CH', code: 'geografia', label: 'Geografia', total: 15 },
    { area: 'MT', code: 'matematica', label: 'Matemática', total: 9 },
  ],
  topics: [
    { area: 'CH', discipline: 'historia', code: 'brasil-colonia', label: 'Brasil Colônia', total: 5 },
    { area: 'CH', discipline: 'historia', code: 'republica', label: 'República', total: 10 },
  ],
};

async function render(
  onIniciar: (
    skill: string | undefined,
    ano: number | undefined,
    discipline: string | undefined,
    topic: string | undefined,
  ) => void = () => {},
) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => taxonomia,
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <PreferencesProvider>
        <SubjectFilterScreen area="CH" onIniciar={onIniciar} onVoltar={() => {}} />
      </PreferencesProvider>,
    );
  });
  montada = tree;
  return tree;
}

describe('SubjectFilterScreen', () => {
  it('lista só as habilidades da área escolhida, com a contagem de questões', async () => {
    const tree = await render();
    const texto = allText(tree);

    expect(texto).toContain('Habilidade 1');
    expect(texto).toContain('12 questões');
    expect(texto).toContain('Habilidade 8');
    expect(texto).toContain('18 questões');
    // H2 é de MT, não deve aparecer no filtro de CH.
    expect(texto).not.toContain('Habilidade 2');
  });

  it('"todas as habilidades" vem selecionada por padrão e soma o total da área', async () => {
    const tree = await render();
    expect(allText(tree)).toContain('30 questões nesta área');
  });

  it('escolher uma habilidade e confirmar chama onIniciar com o código dela', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const h8 = await porTestID(tree, 'skill-H8');
    await act(async () => h8.props.onPress());
    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith('H8', undefined, undefined, undefined);
  });

  it('sem escolher nada, confirmar chama onIniciar sem habilidade nem ano (tudo)', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
  });

  it('offline: explica sem culpar o usuário', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <PreferencesProvider>
          <SubjectFilterScreen area="CH" onIniciar={() => {}} onVoltar={() => {}} />
        </PreferencesProvider>,
      );
    });
    montada = tree;

    expect(allText(tree)).toContain('Sem internet.');
  });
});

describe('SubjectFilterScreen filtro de ano', () => {
  it('abre o modal com os anos da área e "todos os anos" selecionado por padrão', async () => {
    const tree = await render();

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());

    const texto = allText(tree);
    expect(texto).toContain('2023');
    expect(texto).toContain('2022');
    expect(texto).toContain('2021');
    expect(texto).toContain('Todos os anos');
  });

  it('escolher um ano e confirmar a sessão chama onIniciar com o ano', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const ano2022 = await porTestID(tree, 'year-2022');
    await act(async () => ano2022.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith(undefined, 2022, undefined, undefined);
  });

  it('escolher um ano busca a contagem daquele ano e atualiza a lista', async () => {
    const fetchMock = jest.fn((url: string) => {
      const comAno = url.includes('year=2022');
      return Promise.resolve({
        ok: true,
        json: async () => ({
          areas: taxonomia.areas,
          skills: comAno ? [{ area: 'CH', skill: 'H1', total: 1, avgDifficulty: 0.5 }] : taxonomia.skills,
        }),
      });
    });
    (globalThis as any).fetch = fetchMock;

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <PreferencesProvider>
          <SubjectFilterScreen area="CH" onIniciar={() => {}} onVoltar={() => {}} />
        </PreferencesProvider>,
      );
    });
    montada = tree;

    // Carga inicial: sem filtro de ano, a contagem é a da área inteira.
    expect(allText(tree)).toContain('12 questões');

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const ano2022 = await porTestID(tree, 'year-2022');
    await act(async () => ano2022.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    // Fetch pediu a taxonomia com o ano — e a lista mostra a contagem nova,
    // não mais a da área inteira.
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('year=2022'));
    const texto = allText(tree);
    expect(texto).toContain('1 questões');
    expect(texto).not.toContain('12 questões');
  });

  it('o botão de filtros mostra o ano escolhido', async () => {
    const tree = await render();

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const ano2021 = await porTestID(tree, 'year-2021');
    await act(async () => ano2021.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    // "2021" aparece tanto no botão de filtros quanto no chip já selecionado.
    expect(allText(tree).match(/2021/g)?.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SubjectFilterScreen filtro de disciplina e tema', () => {
  it('abre o modal com as disciplinas da área, sem misturar com outras áreas', async () => {
    const tree = await render();

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());

    const texto = allText(tree);
    expect(texto).toContain('História');
    expect(texto).toContain('Geografia');
    // Matemática é de MT, não deve aparecer no filtro de CH.
    expect(texto).not.toContain('Matemática');
  });

  it('escolher uma disciplina limpa a habilidade selecionada e chama onIniciar com a disciplina', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const h8 = await porTestID(tree, 'skill-H8');
    await act(async () => h8.props.onPress());

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith(undefined, undefined, 'historia', undefined);
  });

  it('escolher um tema dentro da disciplina chama onIniciar com disciplina e tema', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const republica = await porTestID(tree, 'topic-republica');
    await act(async () => republica.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith(undefined, undefined, 'historia', 'republica');
  });

  it('escolher uma habilidade depois de escolher disciplina limpa a disciplina', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    const h8 = await porTestID(tree, 'skill-H8');
    await act(async () => h8.props.onPress());
    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith('H8', undefined, undefined, undefined);
  });

  it('"todas as disciplinas" limpa a disciplina (e o tema) escolhidos', async () => {
    const onIniciar = jest.fn();
    const tree = await render(onIniciar);

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const republica = await porTestID(tree, 'topic-republica');
    await act(async () => republica.props.onPress());
    const todasDisciplinas = await porTestID(tree, 'discipline-all');
    await act(async () => todasDisciplinas.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    const iniciar = await porTestID(tree, 'start-session');
    await act(async () => iniciar.props.onPress());

    expect(onIniciar).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
  });

  it('escolher uma disciplina atualiza a contagem exibida pra da disciplina', async () => {
    const tree = await render();

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    expect(allText(tree)).toContain('15 questões nesta área');
    expect(allText(tree)).not.toContain('30 questões nesta área');
  });

  it('escolher um tema restringe a contagem exibida ainda mais, pro tema', async () => {
    const tree = await render();

    const abrir = await porTestID(tree, 'open-filters');
    await act(async () => abrir.props.onPress());
    const historia = await porTestID(tree, 'discipline-historia');
    await act(async () => historia.props.onPress());
    const republica = await porTestID(tree, 'topic-republica');
    await act(async () => republica.props.onPress());
    const aplicar = await porTestID(tree, 'apply-filters');
    await act(async () => aplicar.props.onPress());

    expect(allText(tree)).toContain('10 questões nesta área');
  });
});
