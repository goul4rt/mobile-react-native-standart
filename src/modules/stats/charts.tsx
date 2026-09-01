import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { radius, space } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';

/** Horizontal accuracy bar. Only bars and lines in this app: no radar, no gauge. */
export function BarraAcerto({
  label,
  correct,
  total,
  color,
}: {
  label: string;
  correct: number;
  total: number;
  color?: string;
}) {
  const { palette, type } = usePreferences();
  const pct = total > 0 ? correct / total : 0;

  return (
    <View style={{ gap: space.xs }}>
      <View style={styles.linha}>
        <Text style={[type.body, { color: palette.text }]}>{label}</Text>
        <Text style={[type.label, { color: palette.text }]}>
          {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </Text>
      </View>
      <View style={[styles.trilho, { backgroundColor: palette.surfaceAlt }]}>
        <View
          style={[styles.preenchido, { backgroundColor: color ?? palette.primary, width: `${pct * 100}%` }]}
        />
      </View>
      <Text style={[type.micro, { color: palette.textMuted }]}>
        {total > 0 ? t('stats.ofQuestions', { correct, total }) : t('stats.noAnswers')}
      </Text>
    </View>
  );
}

/** You vs. average, with the sample size always in view. */
export function ComparacaoArea({
  label,
  voce,
  media,
  usuarios,
}: {
  label: string;
  voce: number | null;
  media: number;
  usuarios: number;
}) {
  const { palette, type } = usePreferences();

  return (
    <View style={{ gap: space.sm }}>
      <Text style={[type.heading, { color: palette.text }]}>{label}</Text>
      <Barra label={t('summary.you')} value={voce} color={palette.primary} />
      <Barra label={t('summary.average')} value={media} color={palette.textMuted} />
      <Text style={[type.micro, { color: palette.textMuted }]}>
        {t('summary.basedOn', { count: usuarios })}
      </Text>
    </View>
  );
}

function Barra({ label, value, color }: { label: string; value: number | null; color: string }) {
  const { palette, type } = usePreferences();
  return (
    <View style={styles.parRow}>
      <Text style={[type.caption, { color: palette.textSecondary, width: 52 }]}>{label}</Text>
      <View style={[styles.trilho, { backgroundColor: palette.surfaceAlt, flex: 1 }]}>
        <View style={[styles.preenchido, { backgroundColor: color, width: `${(value ?? 0) * 100}%` }]} />
      </View>
      <Text style={[type.label, { color: palette.text, width: 44, textAlign: 'right' }]}>
        {value === null ? '—' : `${Math.round(value * 100)}%`}
      </Text>
    </View>
  );
}

/**
 * Weekly progress. Needs at least two points: a line with a single point shows
 * no progress at all.
 */
export function LinhaEvolucao({ pontos }: { pontos: { label: string; value: number }[] }) {
  const { palette, type } = usePreferences();

  const largura = 280;
  const altura = 90;

  if (pontos.length < 2) {
    return (
      <View style={[styles.vazio, { borderColor: palette.border }]}>
        <Text style={[type.caption, { color: palette.textMuted }]}>
          {t('stats.noProgress')}
        </Text>
      </View>
    );
  }

  const passo = largura / (pontos.length - 1);
  const coords = pontos.map((ponto, i) => ({
    x: i * passo,
    y: altura - ponto.value * altura,
  }));

  return (
    <View style={{ gap: space.sm }}>
      <Svg width="100%" height={altura} viewBox={`0 0 ${largura} ${altura}`}>
        <Polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={palette.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={palette.primary} />
        ))}
      </Svg>
      <View style={styles.linha}>
        <Text style={[type.micro, { color: palette.textMuted }]}>{pontos[0]!.label}</Text>
        <Text style={[type.micro, { color: palette.textSecondary }]}>
          {t('stats.today', { pct: Math.round(pontos[pontos.length - 1]!.value * 100) })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trilho: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  preenchido: { height: '100%', borderRadius: radius.pill },
  vazio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: space.lg,
  },
});
