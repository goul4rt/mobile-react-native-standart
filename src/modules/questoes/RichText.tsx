import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { RichContent } from '../../shared/api/client';
import { palettes, radius, space, type } from '../../shared/ui-kit/tokens';

const IMAGE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/;

/**
 * Inline suportado: negrito, itálico e link. O acervo tem ~960 links (quase
 * todos referência bibliográfica: "Disponível em: [site](url)") — sem tratar,
 * o aluno lê a sintaxe crua no meio do enunciado.
 */
const INLINE = /(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

/**
 * Imagem de prova escaneada: a maioria vem com fundo branco. No tema escuro ela
 * fica num contêiner `surface` e leva brightness 0.88, senão queima a tela.
 */
function ScannedImage({ url }: { url: string }) {
  const dark = useColorScheme() === 'dark';
  const palette = dark ? palettes.dark : palettes.light;
  const [ratio, setRatio] = useState(1.6);

  useEffect(() => {
    let alive = true;
    Image.getSize(
      url,
      (w, h) => alive && h > 0 && setRatio(w / h),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <View
      style={[
        styles.imageBox,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}>
      <Image
        source={{ uri: url }}
        style={[styles.image, { aspectRatio: ratio }, dark && styles.dimmed]}
        resizeMode="contain"
      />
    </View>
  );
}

type Segmento = { texto: string; estilo?: object };

function segmentar(texto: string): Segmento[] {
  const saida: Segmento[] = [];
  let ultimo = 0;

  for (const m of texto.matchAll(INLINE)) {
    const inicio = m.index;
    if (inicio > ultimo) saida.push({ texto: texto.slice(ultimo, inicio) });

    const [token, negrito, italico, link] = m;
    if (negrito) saida.push({ texto: negrito.slice(2, -2), estilo: styles.bold });
    else if (italico) saida.push({ texto: italico.slice(1, -1), estilo: styles.italic });
    // Do link fica só o rótulo: a URL não é clicável aqui e polui a leitura.
    else if (link) saida.push({ texto: link.slice(1, link.indexOf(']')) });

    ultimo = inicio + token.length;
  }
  if (ultimo < texto.length) saida.push({ texto: texto.slice(ultimo) });
  return saida;
}

function Paragraph({ text, style }: { text: string; style: object }) {
  return (
    <Text style={style}>
      {segmentar(text).map((s, i) => (
        <Text key={i} style={s.estilo}>
          {s.texto}
        </Text>
      ))}
    </Text>
  );
}

/**
 * Parágrafo em markdown é separado por linha em branco; quebra simples é só
 * hard wrap do texto original e tem que virar espaço. Imagem sempre vira bloco
 * próprio, mesmo grudada num parágrafo.
 */
function toBlocks(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .flatMap((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        // Uma imagem interrompe o parágrafo; o resto se junta em texto corrido.
        .reduce<string[]>((blocks, line) => {
          if (IMAGE.test(line)) return [...blocks, line];
          const last = blocks[blocks.length - 1];
          if (last === undefined || IMAGE.test(last)) return [...blocks, line];
          blocks[blocks.length - 1] = `${last} ${line}`;
          return blocks;
        }, []),
    )
    .filter(Boolean);
}

export function RichText({ content, variant = 'body' }: { content: RichContent; variant?: 'body' | 'alternative' }) {
  const dark = useColorScheme() === 'dark';
  const palette = dark ? palettes.dark : palettes.light;
  const textStyle = { ...type[variant], color: palette.text };

  return (
    <View>
      {toBlocks(content.body).map((block, i) => {
        const image = block.match(IMAGE);
        if (image) return <ScannedImage key={i} url={image[1]} />;
        return <Paragraph key={i} text={block} style={{ ...textStyle, marginBottom: space.md }} />;
      })}
      {/* Imagens de `media` que não aparecem embutidas no corpo. */}
      {content.media
        .filter((m) => !content.body.includes(m.url))
        .map((m) => (
          <ScannedImage key={m.id} url={m.url} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  imageBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.sm,
    marginVertical: space.md,
  },
  image: { width: '100%' },
  dimmed: { filter: [{ brightness: 0.88 }] },
  bold: { fontFamily: 'PublicSans-Bold' },
  italic: { fontFamily: 'PublicSans-Italic' },
});
