import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchMinhasEstatisticas,
  fetchPopulacaoPorArea,
  type EstatisticaPopulacao,
  type MinhasEstatisticas,
} from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { BarraAcerto, ComparacaoArea, LinhaEvolucao } from './charts';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { currentLocale, subjectLabel, t } from '../../shared/i18n';
import { Centered, Screen } from '../../shared/ui-kit/primitives';

type Tab = 'you' | 'others';

function formatTime(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function StatsScreen() {
  const { palette, type } = usePreferences();
  const { token } = useAuth();

  const [tab, setTab] = useState<Tab>('you');
  const [minhas, setMinhas] = useState<MinhasEstatisticas | null>(null);
  const [populacao, setPopulacao] = useState<EstatisticaPopulacao[]>([]);
  const [loading, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const t = await token();
    if (!t) return;
    const [meu, geral] = await Promise.all([
      fetchMinhasEstatisticas(t).catch(() => null),
      fetchPopulacaoPorArea().catch(() => []),
    ]);
    setMinhas(meu);
    setPopulacao(geral);
    setCarregando(false);
  }, [token]);

  // The numbers change if a session happened since the last visit.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
      </Centered>
    );
  }

  const answered = minhas?.overall.total ?? 0;

  return (
    <Screen>
      <Text style={[type.title, { color: palette.text, paddingHorizontal: space.xxl }]}>{t('stats.title')}</Text>

      <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
        {(
          [
            ['you', t('stats.tabYou')],
            ['others', t('stats.tabOthers')],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            testID={`tab-${key}`}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && { borderBottomColor: palette.primary }]}>
            <Text style={[type.label, { color: tab === key ? palette.text : palette.textMuted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.corpo}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={carregar} tintColor={palette.primary} />
        }>
        {answered === 0 ? (
          <View style={[styles.vazio, { borderColor: palette.border }]}>
            <Text style={[type.body, { color: palette.textSecondary }]}>
              {t('stats.empty')}
            </Text>
          </View>
        ) : tab === 'you' ? (
          <>
            <Secao titulo={t('stats.accuracyBySubject')}>
              <View style={{ gap: space.lg }}>
                {minhas!.byArea.map((a) => (
                  <BarraAcerto
                    key={a.area}
                    label={subjectLabel(a.area)}
                    correct={a.correct}
                    total={a.total}
                  />
                ))}
              </View>
            </Secao>

            <Secao titulo={t('stats.progress')}>
              <LinhaEvolucao
                pontos={[...minhas!.weekly]
                  .reverse()
                  .map((s) => ({
                    label: new Date(s.week).toLocaleDateString(currentLocale(), {
                      day: '2-digit',
                      month: '2-digit',
                    }),
                    value: s.total > 0 ? s.correct / s.total : 0,
                  }))}
              />
            </Secao>

            <View style={styles.numeros}>
              <Stat value={formatTime(minhas!.overall.avg_time_ms)} label={t('stats.averageTime')} />
              <Stat value={String(answered)} label={t('stats.questionsAnswered')} />
              <Stat
                value={`${Math.round((minhas!.overall.correct / answered) * 100)}%`}
                label={t('stats.accuracy')}
              />
            </View>
          </>
        ) : (
          <>
            {minhas!.byArea.map((minha) => {
              const geral = populacao.find((g) => g.area === minha.area);
              if (!geral) {
                return (
                  <View
                    key={minha.area}
                    style={[styles.vazio, { borderColor: palette.border, marginBottom: space.lg }]}>
                    <Text style={[type.heading, { color: palette.text, marginBottom: space.xs }]}>
                      {subjectLabel(minha.area)}
                    </Text>
                    <Text style={[type.caption, { color: palette.textSecondary }]}>
                      {t('stats.noSampleSubject')}
                    </Text>
                  </View>
                );
              }
              return (
                <View key={minha.area} style={{ marginBottom: space.xl }}>
                  <ComparacaoArea
                    label={subjectLabel(minha.area)}
                    voce={minha.total > 0 ? minha.correct / minha.total : null}
                    media={geral.accuracy}
                    usuarios={geral.users}
                  />
                </View>
              );
            })}
            <Text style={[type.micro, { color: palette.textMuted }]}>
              {t('stats.comparisonFooter')}
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { palette, type } = usePreferences();
  return (
    <View style={{ marginBottom: space.section }}>
      <Text style={[type.micro, { color: palette.textMuted, marginBottom: space.md }]}>
        {titulo.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { palette, type } = usePreferences();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
      <Text style={[type.title, { color: palette.text }]}>{value}</Text>
      <Text style={[type.micro, { color: palette.textMuted, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  corpo: { padding: space.xxl, paddingBottom: space.section },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: space.lg },
  tab: {
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderBottomWidth: border.strong,
    borderBottomColor: 'transparent',
  },
  numeros: { flexDirection: 'row', gap: space.md },
  vazio: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: space.lg },
});
