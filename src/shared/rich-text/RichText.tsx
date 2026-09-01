import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { RichContent } from '../api/client';
import { radius, space } from '../ui-kit/tokens';
import { usePreferences } from '../preferences/PreferencesContext';
import { segmentar, toBlocks, type Segmento } from './parse';

/**
 * Scanned exam image: most come with a white background. On the dark theme it
 * sits on a `surface` container and takes brightness 0.88, or it burns the screen.
 */
function ScannedImage({ url }: { url: string }) {
  const { palette, isDark: dark } = usePreferences();
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
      style={[styles.imageBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Image
        source={{ uri: url }}
        style={[styles.image, { aspectRatio: ratio }, dark && styles.dimmed]}
        resizeMode="contain"
      />
    </View>
  );
}

const estiloDaEnfase = (enfase: Segmento['enfase']) =>
  enfase === 'negrito' ? styles.bold : enfase === 'italico' ? styles.italic : undefined;

function Paragraph({ text, style }: { text: string; style: object }) {
  return (
    <Text style={style}>
      {segmentar(text).map((s, i) => (
        <Text key={i} style={estiloDaEnfase(s.enfase)}>
          {s.texto}
        </Text>
      ))}
    </Text>
  );
}

export function RichText({
  content,
  variant = 'body',
}: {
  content: RichContent;
  variant?: 'body' | 'alternative';
}) {
  const { palette, type } = usePreferences();
  const textStyle = { ...type[variant], color: palette.text };

  return (
    <View>
      {toBlocks(content.body).map((block, i) =>
        block.tipo === 'imagem' ? (
          <ScannedImage key={i} url={block.url} />
        ) : (
          <Paragraph key={i} text={block.texto} style={{ ...textStyle, marginBottom: space.md }} />
        ),
      )}
      {/* Images from `media` that are not embedded in the body. */}
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
    overflow: 'hidden',
    marginBottom: space.md,
    padding: space.sm,
  },
  image: { width: '100%' },
  dimmed: { filter: [{ brightness: 0.88 }] },
  bold: { fontFamily: 'PublicSans-Bold' },
  italic: { fontFamily: 'PublicSans-Italic' },
});
