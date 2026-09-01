import { segmentar, toBlocks } from '../src/shared/rich-text/parse';

const IMG = 'https://exemplo.test/figura.png';
const textos = (body: string) =>
  toBlocks(body)
    .filter((b) => b.tipo === 'texto')
    .map((b) => (b as { texto: string }).texto);

describe('toBlocks', () => {
  it('mantém o texto que vem antes e depois de uma imagem na mesma linha', () => {
    // O defeito que motivou este módulo: a linha inteira virava bloco de imagem
    // e o enunciado dos dois lados sumia da tela, sem erro nenhum.
    const blocos = toBlocks(`Observe a figura ![](${IMG}) e responda.`);

    expect(blocos).toEqual([
      { tipo: 'texto', texto: 'Observe a figura' },
      { tipo: 'imagem', url: IMG },
      { tipo: 'texto', texto: 'e responda.' },
    ]);
  });

  it('preserva a ordem com várias imagens numa linha só', () => {
    const b = toBlocks(`Compare ![](${IMG}) com ![](https://exemplo.test/b.png) agora`);
    expect(b.map((x) => x.tipo)).toEqual(['texto', 'imagem', 'texto', 'imagem', 'texto']);
  });

  it('junta quebras simples no mesmo parágrafo', () => {
    expect(textos('uma linha\nsegunda linha')).toEqual(['uma linha segunda linha']);
  });

  it('separa parágrafos em linha em branco', () => {
    expect(textos('primeiro\n\nsegundo')).toEqual(['primeiro', 'segundo']);
  });

  it('imagem sozinha continua sendo um bloco de imagem', () => {
    expect(toBlocks(`![](${IMG})`)).toEqual([{ tipo: 'imagem', url: IMG }]);
  });

  it('não inventa bloco a partir de corpo vazio', () => {
    expect(toBlocks('')).toEqual([]);
    expect(toBlocks('\n\n   \n')).toEqual([]);
  });

  it('não confunde colchete comum com imagem', () => {
    expect(textos('use [x] para marcar')).toEqual(['use [x] para marcar']);
  });
});

describe('segmentar', () => {
  it('marca negrito e itálico', () => {
    expect(segmentar('um **forte** e um *leve*')).toEqual([
      { texto: 'um ' },
      { texto: 'forte', enfase: 'negrito' },
      { texto: ' e um ' },
      { texto: 'leve', enfase: 'italico' },
    ]);
  });

  it('do link fica só o rótulo, porque a URL não é clicável aqui', () => {
    expect(segmentar('ver [fonte](https://x.test) ali')).toEqual([
      { texto: 'ver ' },
      { texto: 'fonte' },
      { texto: ' ali' },
    ]);
  });

  it('texto sem marcação sai inteiro', () => {
    expect(segmentar('nada demais')).toEqual([{ texto: 'nada demais' }]);
  });
});
