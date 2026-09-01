import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchTaxonomy, type AreaResumo } from '../../shared/api/client';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';
import { Button, Screen } from '../../shared/ui-kit/primitives';

/**
 * The list comes from the corpus taxonomy, not a constant: the filter only
 * offers what actually exists to answer, with real counts.
 */
export function SubjectPicker({ onEscolher }: { onEscolher: (area: string) => void }) {
  const { palette, type } = usePreferences();

  const [areas, setAreas] = useState<AreaResumo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setError(null);
    setAreas(null);
    fetchTaxonomy()
      .then(setAreas)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.corpo}>
        <Text style={[type.display, { color: palette.text }]}>{t('subjectPicker.question')}</Text>
        <Text style={[type.caption, { color: palette.textMuted }]}>{t('subjectPicker.subtitle')}</Text>

        {error && (
          <View style={{ marginTop: space.xl, gap: space.lg }}>
            <Text style={[type.body, { color: palette.textSecondary }]}>
              {t('common.offline')}
            </Text>
            {/* A network failure with no retry button traps the student on this screen. */}
            <Button testID="try-again" label={t('common.tryAgain')} onPress={carregar} />
          </View>
        )}

        {!areas && !error && <ActivityIndicator color={palette.primary} style={{ marginTop: space.section }} />}

        <View style={{ gap: space.md, marginTop: space.xl }}>
          {areas?.map((area) => (
            <Pressable
              key={area.code}
              testID={`area-${area.code}`}
              onPress={() => onEscolher(area.code)}
              style={({ pressed }) => [
                styles.cartao,
                {
                  backgroundColor: palette.surface,
                  borderColor: pressed ? palette.primary : palette.border,
                },
              ]}>
              <Text style={[type.heading, { color: palette.text }]}>{area.label}</Text>
              <Text style={[type.caption, { color: palette.textMuted }]}>
                {area.total} {area.total === 1 ? 'questão' : 'questões'}
              </Text>
            </Pressable>
          ))}
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  corpo: { padding: space.xxl },
  cartao: {
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.xs,
  },
});
