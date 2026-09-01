import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space } from '../../shared/ui-kit/tokens';
import { Button, Screen } from '../../shared/ui-kit/primitives';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';

const NOME_DO_APP = 'Questiona';

export function Welcome({
  onCriarConta,
  onEntrar,
}: {
  onCriarConta: () => void;
  onEntrar: () => void;
}) {
  const { palette, type } = usePreferences();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.apresentacao}>
        <View style={[styles.marca, { backgroundColor: palette.primary }]}>
          <Text style={[type.display, { color: palette.onPrimary }]}>{NOME_DO_APP.charAt(0)}</Text>
        </View>
        <Text style={[type.display, { color: palette.text, marginTop: space.xl }]}>{NOME_DO_APP}</Text>
        <Text style={[type.body, { color: palette.textSecondary, marginTop: space.sm }]}>
          {t('welcome.tagline')}
        </Text>
      </View>

      <View style={styles.acoes}>
        <Button testID="create-account" label={t('welcome.createAccount')} onPress={onCriarConta} />
        <Button
          testID="have-account"
          variant="plain"
          label={t('welcome.haveAccount')}
          onPress={onEntrar}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  apresentacao: { flex: 1, justifyContent: 'center', padding: space.xxl },
  marca: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acoes: { padding: space.xxl, gap: space.md },
});
