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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchMinhasEstatisticas,
  fetchTaxonomy,
  type AreaResumo,
  type MinhasEstatisticas,
} from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { subjectLabel, t } from '../../shared/i18n';
import { Button, Centered } from '../../shared/ui-kit/primitives';

export function HomeScreen({ onStudy }: { onStudy: (area: string) => void }) {
  const { palette, type } = usePreferences();
  const { user, token } = useAuth();

  const [areas, setAreas] = useState<AreaResumo[] | null>(null);
  const [minhas, setMinhas] = useState<MinhasEstatisticas | null>(null);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    setError(false);
    const t = await token();
    const [taxonomia, estatisticas] = await Promise.all([
      fetchTaxonomy().catch(() => null),
      t ? fetchMinhasEstatisticas(t).catch(() => null) : Promise.resolve(null),
    ]);
    if (!taxonomia) return setError(true);
    setAreas(taxonomia);
    setMinhas(estatisticas);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const acertoPorArea = new Map(
    (minhas?.byArea ?? []).map((a) => [a.area, { total: a.total, correct: a.correct }]),
  );

  // "Pick up where you left off" is the most-answered subject: the one the
  // student already chose with their fingers, not the one we think they need.
  const continuar = [...acertoPorArea.entries()].sort((a, b) => b[1].total - a[1].total)[0];

  const semana = minhas?.weekly?.[0];
  const primeiroNome = user?.name?.split(' ')[0];

  if (error) {
    return (
      <Centered>
        <Text style={[type.heading, { color: palette.text, textAlign: 'center' }]}>
          {t('common.offline')}
        </Text>
        <Button
          testID="try-again"
          label={t('common.tryAgain')}
          onPress={carregar}
          style={{ marginTop: space.xl, paddingHorizontal: space.xl }}
        />
      </Centered>
    );
  }

  if (!areas) {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
      </Centered>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={carregar} tintColor={palette.primary} />
        }>
        <Text style={[type.title, { color: palette.text }]}>
          {primeiroNome ? t('home.greeting', { name: primeiroNome }) : t('home.greetingNoName')}
        </Text>

        {continuar && (
          <Pressable
            testID="continuar"
            onPress={() => onStudy(continuar[0])}
            style={({ pressed }) => [
              styles.destaque,
              { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
            ]}>
            <Text style={[type.micro, { color: palette.onPrimary, opacity: 0.8 }]}>
              {t('home.continue')}
            </Text>
            <Text style={[type.heading, { color: palette.onPrimary, marginTop: space.xs }]}>
              {subjectLabel(continuar[0])}
            </Text>
            <Text style={[type.caption, { color: palette.onPrimary, opacity: 0.85 }]}>
              {t('home.answered', {
                total: continuar[1].total,
                pct: Math.round((continuar[1].correct / continuar[1].total) * 100),
              })}
            </Text>
          </Pressable>
        )}

        <Text style={[type.micro, { color: palette.textMuted, marginTop: space.xl }]}>
          {t('home.studyBySubject')}
        </Text>
        <View style={{ gap: space.md, marginTop: space.md }}>
          {areas.map((area) => {
            const meu = acertoPorArea.get(area.code);
            return (
              <Pressable
                key={area.code}
                testID={`area-${area.code}`}
                onPress={() => onStudy(area.code)}
                style={({ pressed }) => [
                  styles.cartao,
                  { backgroundColor: palette.surface, borderColor: pressed ? palette.primary : palette.border },
                ]}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: palette.text }]}>
                    {subjectLabel(area.code)}
                  </Text>
                  <Text style={[type.caption, { color: palette.textMuted }]}>
                    {meu
                      ? t('home.accuracyOfAnswered', {
                          pct: Math.round((meu.correct / meu.total) * 100),
                          total: meu.total,
                        })
                      : t('home.questions', { total: area.total })}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {semana && semana.total > 0 && (
          <View style={[styles.resumo, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={[type.micro, { color: palette.textMuted }]}>{t('home.thisWeek')}</Text>
            <Text style={[type.body, { color: palette.text }]}>
              {t('home.weekSummary', {
                total: semana.total,
                pct: Math.round((semana.correct / semana.total) * 100),
              })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  conteudo: { padding: space.xxl, paddingBottom: space.section },
  destaque: { borderRadius: radius.xl, padding: space.xl, marginTop: space.xl },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  resumo: { borderRadius: radius.lg, padding: space.lg, marginTop: space.xl, gap: space.xs },
});
