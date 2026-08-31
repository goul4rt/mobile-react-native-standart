import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { radius, space } from '../../shared/ui-kit/tokens';
import { useTema } from '../../shared/ui-kit/PreferenciasContext';
import { t } from '../../shared/i18n';

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
  const { p, type } = useTema();
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
        {total > 0 ? t('estatisticas.deQuestoes', { acertos, total }) : t('estatisticas.nenhumaResposta')}
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
  const { p, type } = useTema();

  return (
    <View style={{ gap: space.sm }}>
      <Text style={[type.heading, { color: p.text }]}>{rotulo}</Text>
      <Barra rotulo={t('fim.voce')} valor={voce} cor={p.primary} />
      <Barra rotulo={t('fim.media')} valor={media} cor={p.textMuted} />
      <Text style={[type.micro, { color: p.textMuted }]}>
        baseado em {usuarios.toLocaleString('pt-BR')} {usuarios === 1 ? 'pessoa' : 'pessoas'}
      </Text>
    </View>
  );
}

function Barra({ rotulo, valor, cor }: { rotulo: string; valor: number | null; cor: string }) {
  const { p, type } = useTema();
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
  const { p, type } = useTema();

  const largura = 280;
  const altura = 90;

  if (pontos.length < 2) {
    return (
      <View style={[styles.vazio, { borderColor: p.border }]}>
        <Text style={[type.caption, { color: p.textMuted }]}>
          {t('estatisticas.semEvolucao')}
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
          {t('estatisticas.hoje', { pct: Math.round(pontos[pontos.length - 1]!.valor * 100) })}
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
