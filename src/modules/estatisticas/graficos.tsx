import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { palettes, radius, space, type } from '../../shared/ui-kit/tokens';

/** Barra horizontal de acerto. Só barra e linha no app — sem radar nem gauge. */
export function BarraAcerto({
  rotulo,
  acertos,
  total,
  cor,
}: {
  rotulo: string;
  acertos: number;
  total: number;
  cor?: string;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const pct = total > 0 ? acertos / total : 0;

  return (
    <View style={{ gap: space.xs }}>
      <View style={styles.linha}>
        <Text style={[type.body, { color: p.text }]}>{rotulo}</Text>
        <Text style={[type.label, { color: p.text }]}>
          {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </Text>
      </View>
      <View style={[styles.trilho, { backgroundColor: p.surfaceAlt }]}>
        <View
          style={[styles.preenchido, { backgroundColor: cor ?? p.primary, width: `${pct * 100}%` }]}
        />
      </View>
      <Text style={[type.micro, { color: p.textMuted }]}>
        {total > 0 ? `${acertos} de ${total} questões` : 'nenhuma resposta ainda'}
      </Text>
    </View>
  );
}

/** Par você × média, com o tamanho da amostra sempre à vista. */
export function ComparacaoArea({
  rotulo,
  voce,
  media,
  usuarios,
}: {
  rotulo: string;
  voce: number | null;
  media: number;
  usuarios: number;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  return (
    <View style={{ gap: space.sm }}>
      <Text style={[type.heading, { color: p.text }]}>{rotulo}</Text>
      <Barra rotulo="você" valor={voce} cor={p.primary} />
      <Barra rotulo="média" valor={media} cor={p.textMuted} />
      <Text style={[type.micro, { color: p.textMuted }]}>
        baseado em {usuarios.toLocaleString('pt-BR')} {usuarios === 1 ? 'pessoa' : 'pessoas'}
      </Text>
    </View>
  );
}

function Barra({ rotulo, valor, cor }: { rotulo: string; valor: number | null; cor: string }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  return (
    <View style={styles.parLinha}>
      <Text style={[type.caption, { color: p.textSecondary, width: 52 }]}>{rotulo}</Text>
      <View style={[styles.trilho, { backgroundColor: p.surfaceAlt, flex: 1 }]}>
        <View style={[styles.preenchido, { backgroundColor: cor, width: `${(valor ?? 0) * 100}%` }]} />
      </View>
      <Text style={[type.label, { color: p.text, width: 44, textAlign: 'right' }]}>
        {valor === null ? '—' : `${Math.round(valor * 100)}%`}
      </Text>
    </View>
  );
}

/**
 * Evolução por semana. Precisa de pelo menos dois pontos: uma linha com um
 * ponto só não mostra evolução nenhuma.
 */
export function LinhaEvolucao({ pontos }: { pontos: { rotulo: string; valor: number }[] }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;

  const largura = 280;
  const altura = 90;

  if (pontos.length < 2) {
    return (
      <View style={[styles.vazio, { borderColor: p.border }]}>
        <Text style={[type.caption, { color: p.textMuted }]}>
          A evolução aparece a partir da segunda semana de estudo.
        </Text>
      </View>
    );
  }

  const passo = largura / (pontos.length - 1);
  const coords = pontos.map((ponto, i) => ({
    x: i * passo,
    y: altura - ponto.valor * altura,
  }));

  return (
    <View style={{ gap: space.sm }}>
      <Svg width="100%" height={altura} viewBox={`0 0 ${largura} ${altura}`}>
        <Polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={p.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={p.primary} />
        ))}
      </Svg>
      <View style={styles.linha}>
        <Text style={[type.micro, { color: p.textMuted }]}>{pontos[0]!.rotulo}</Text>
        <Text style={[type.micro, { color: p.textSecondary }]}>
          hoje: {Math.round(pontos[pontos.length - 1]!.valor * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trilho: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  preenchido: { height: '100%', borderRadius: radius.pill },
  vazio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: space.lg,
  },
});
