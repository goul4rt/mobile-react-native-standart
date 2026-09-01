/** Question markdown, no React: text in, structure out. */

/** Global because a single line may hold several images. */
const IMAGE_GLOBAL = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
export const IMAGE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/;

const INLINE = /(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

export type Bloco =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagem'; url: string };

/**
 * A line's text and images, in order. "See figure ![](u) and answer" is three
 * blocks: treating the whole line as an image would drop the text on both sides.
 */
function quebrarLinha(linha: string): Bloco[] {
  const blocos: Bloco[] = [];
  let cursor = 0;

  for (const m of linha.matchAll(IMAGE_GLOBAL)) {
    const antes = linha.slice(cursor, m.index).trim();
    if (antes) blocos.push({ tipo: 'texto', texto: antes });
    blocos.push({ tipo: 'imagem', url: m[1] });
    cursor = m.index + m[0].length;
  }

  const resto = linha.slice(cursor).trim();
  if (resto) blocos.push({ tipo: 'texto', texto: resto });
  return blocos;
}

/** A blank line separates paragraphs; a single break is hard wrap, so it becomes a space. */
export function toBlocks(body: string): Bloco[] {
  const blocos: Bloco[] = [];

  for (const paragrafo of body.split(/\n\s*\n/)) {
    // Joining never crosses a paragraph, or two statements become one.
    let inicioDoParagrafo = blocos.length;

    for (const linha of paragrafo.split('\n').map((l) => l.trim()).filter(Boolean)) {
      for (const bloco of quebrarLinha(linha)) {
        const anterior = blocos.length > inicioDoParagrafo ? blocos[blocos.length - 1] : undefined;
        if (bloco.tipo === 'texto' && anterior?.tipo === 'texto') {
          anterior.texto = `${anterior.texto} ${bloco.texto}`;
        } else {
          blocos.push(bloco);
        }
      }
    }
  }

  return blocos;
}

export type Segmento = { texto: string; enfase?: 'negrito' | 'italico' };

/** Bold, italic and links. Only the link label survives: the URL is not tappable here. */
export function segmentar(texto: string): Segmento[] {
  const saida: Segmento[] = [];
  let ultimo = 0;

  for (const m of texto.matchAll(INLINE)) {
    const inicio = m.index;
    if (inicio > ultimo) saida.push({ texto: texto.slice(ultimo, inicio) });

    const [token, negrito, italico, link] = m;
    if (negrito) saida.push({ texto: negrito.slice(2, -2), enfase: 'negrito' });
    else if (italico) saida.push({ texto: italico.slice(1, -1), enfase: 'italico' });
    else if (link) saida.push({ texto: link.slice(1, link.indexOf(']')) });

    ultimo = inicio + token.length;
  }
  if (ultimo < texto.length) saida.push({ texto: texto.slice(ultimo) });
  return saida;
}
