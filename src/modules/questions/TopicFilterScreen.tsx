import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchTaxonomy, type Taxonomy } from '../../shared/api/client';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { subjectLabel, t } from '../../shared/i18n';
import { BackButton, Button, Centered, Screen } from '../../shared/ui-kit/primitives';

export function TopicFilterScreen({
  onIniciar,
  onVoltar,
}: {
  onIniciar: (area: string, discipline: string, topic: string | undefined) => void;
  onVoltar: () => void;
}) {
  const { palette, type } = usePreferences();

  const [taxonomia, setTaxonomia] = useState<Taxonomy | null>(null);
  const [error, setError] = useState(false);
  const [area, setArea] = useState<string | undefined>(undefined);
  const [discipline, setDiscipline] = useState<string | undefined>(undefined);
  const [topic, setTopic] = useState<string | undefined>(undefined);

  const carregar = React.useCallback(() => {
    setError(false);
    fetchTaxonomy()
      .then(setTaxonomia)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

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

  if (!taxonomia) {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
      </Centered>
    );
  }

  const disciplinasDaArea = taxonomia.disciplines.filter((d) => d.area === area);
  const temasDaDisciplina = taxonomia.topics.filter((topico) => topico.discipline === discipline);

  const selecionarArea = (codigo: string) => {
    setArea(codigo);
    setDiscipline(undefined);
    setTopic(undefined);
  };

  const selecionarDisciplina = (codigo: string) => {
    setDiscipline(codigo);
    setTopic(undefined);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <BackButton onPress={onVoltar} />
        <Text style={[type.title, { color: palette.text, marginTop: space.sm }]}>
          {t('topicFilter.title')}
        </Text>
      </View>

      <ScrollView
        style={styles.rolagem}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        overScrollMode="never">
        <Text style={[type.micro, { color: palette.textMuted }]}>{t('topicFilter.areaSection')}</Text>
        <View style={styles.chips}>
          {taxonomia.areas.map((a) => (
            <Chip
              key={a.code}
              testID={`area-${a.code}`}
              label={subjectLabel(a.code)}
              selecionado={area === a.code}
              onPress={() => selecionarArea(a.code)}
            />
          ))}
        </View>

        {area && (
          <>
            <Text style={[type.micro, { color: palette.textMuted, marginTop: space.xl }]}>
              {t('topicFilter.disciplineSection')}
            </Text>
            {disciplinasDaArea.length === 0 ? (
              <Text style={[type.caption, { color: palette.textMuted, marginTop: space.md }]}>
                {t('topicFilter.emptyDisciplines')}
              </Text>
            ) : (
              <View style={styles.chips}>
                {disciplinasDaArea.map((d) => (
                  <Chip
                    key={d.code}
                    testID={`discipline-${d.code}`}
                    label={d.label}
                    selecionado={discipline === d.code}
                    onPress={() => selecionarDisciplina(d.code)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {discipline && (
          <>
            <Text style={[type.micro, { color: palette.textMuted, marginTop: space.xl }]}>
              {t('topicFilter.topicSection')}
            </Text>
            <View style={styles.chips}>
              <Chip
                testID="topic-all"
                label={t('topicFilter.allTopics')}
                selecionado={topic === undefined}
                onPress={() => setTopic(undefined)}
              />
              {temasDaDisciplina.map((tm) => (
                <Chip
                  key={tm.code}
                  testID={`topic-${tm.code}`}
                  label={tm.label}
                  selecionado={topic === tm.code}
                  onPress={() => setTopic(tm.code)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {area && discipline && (
        <View style={[styles.rodape, { borderTopColor: palette.border }]}>
          <Button
            testID="start-session"
            label={t('topicFilter.start')}
            onPress={() => onIniciar(area, discipline, topic)}
          />
        </View>
      )}
    </Screen>
  );
}

function Chip({
  testID,
  label,
  selecionado,
  onPress,
}: {
  testID: string;
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  const { palette, type } = usePreferences();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selecionado ? palette.primary : pressed ? palette.surfaceAlt : palette.surface,
          borderColor: selecionado ? palette.primary : palette.border,
        },
      ]}>
      <Text style={[type.caption, { color: selecionado ? palette.onPrimary : palette.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topo: { paddingHorizontal: space.xxl },
  rolagem: { flex: 1 },
  lista: { padding: space.xxl, paddingTop: space.lg, paddingBottom: space.section },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: {
    borderWidth: border.normal,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  rodape: { borderTopWidth: 1, padding: space.lg, paddingHorizontal: space.xxl },
});
