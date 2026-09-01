import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../shared/auth/AuthContext';
import { space } from '../../shared/ui-kit/tokens';
import { BackButton, Button, Screen } from '../../shared/ui-kit/primitives';
import { Field } from './Field';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';

export function Login({ onVoltar, onCriarConta }: { onVoltar: () => void; onCriarConta: () => void }) {
  const { palette, type } = usePreferences();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && password.length > 0 && !submitting;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboardAware edges={['top', 'bottom']}>
      <BackButton onPress={onVoltar} />

      <Text style={[type.title, { color: palette.text, marginBottom: space.xl }]}>{t('login.title')}</Text>

      <View style={{ gap: space.lg }}>
        <Field
          label={t('signUp.email')}
          testID="field-email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label={t('signUp.password')}
          testID="field-password"
          placeholder={t('login.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secret
          autoCapitalize="none"
        />
      </View>

      {!!error && (
        <Text style={[type.caption, { color: palette.dangerText, marginTop: space.md }]}>{error}</Text>
      )}

      <Button
        testID="submit-login"
        label={t('login.title')}
        onPress={submit}
        disabled={!canSubmit}
        busy={submitting}
        style={{ marginTop: space.lg }}
      />

      <Button
        testID="go-to-signup"
        variant="plain"
        label={t('login.createOne')}
        onPress={onCriarConta}
      />
    </Screen>
  );
}
