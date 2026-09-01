import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { BackButton, Button, Screen } from '../../shared/ui-kit/primitives';
import { Field } from './Field';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';
import { DOCUMENTOS, abrirDocumento } from '../../shared/documents';

const SENHA_MINIMA = 8;

export function SignUp({ onVoltar, onEntrar }: { onVoltar: () => void; onEntrar: () => void }) {
  const { palette, type } = usePreferences();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Consent is an act, not a default: the button only enables once it is checked.
  const canSubmit = consent && email.includes('@') && password.length >= SENHA_MINIMA && !submitting;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const estiloLink = { color: palette.primary, textDecorationLine: 'underline' as const };

  return (
    <Screen keyboardAware edges={['top', 'bottom']}>
      <BackButton onPress={onVoltar} />

      <Text style={[type.title, { color: palette.text, marginBottom: space.xl }]}>{t('signUp.title')}</Text>

      <View style={{ gap: space.lg }}>
        <Field
          label={t('signUp.name')}
          testID="field-name"
          placeholder={t('signUp.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
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
          placeholder={t('signUp.passwordPlaceholder', { minimo: SENHA_MINIMA })}
          value={password}
          onChangeText={setPassword}
          secret
          autoCapitalize="none"
        />
      </View>

      <Pressable
        testID="consent"
        onPress={() => setConsent((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        accessibilityLabel={t('signUp.consent')}
        style={styles.consent}>
        <View
          style={[
            styles.caixinha,
            {
              borderColor: consent ? palette.primary : palette.border,
              backgroundColor: consent ? palette.primary : 'transparent',
            },
          ]}>
          {consent && <Text style={[type.caption, { color: palette.onPrimary }]}>✓</Text>}
        </View>
        {/* The document names open the text; tapping anywhere else checks the box. */}
        <Text style={[type.caption, { color: palette.textSecondary, flex: 1 }]}>
          {t('signUp.consentBefore')}
          <Text
            testID="link-terms"
            accessibilityRole="link"
            onPress={() => abrirDocumento(DOCUMENTOS.termos)}
            style={estiloLink}>
            {t('documents.terms')}
          </Text>
          {t('signUp.consentBetween')}
          <Text
            testID="link-privacy"
            accessibilityRole="link"
            onPress={() => abrirDocumento(DOCUMENTOS.politica)}
            style={estiloLink}>
            {t('documents.privacyPolicy')}
          </Text>
          {t('signUp.consentEnd')}
        </Text>
      </Pressable>

      {!!error && (
        <Text style={[type.caption, { color: palette.dangerText, marginTop: space.md }]}>{error}</Text>
      )}

      <Button
        testID="submit-signup"
        label={t('signUp.createAccount')}
        onPress={submit}
        disabled={!canSubmit}
        busy={submitting}
        style={{ marginTop: space.lg }}
      />

      {!consent && (
        <Text style={[type.micro, { color: palette.textMuted, textAlign: 'center' }]}>
          {t('signUp.consentHint')}
        </Text>
      )}

      <Button
        testID="go-to-login"
        variant="plain"
        label={t('welcome.haveAccount')}
        onPress={onEntrar}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: { flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: space.lg },
  caixinha: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
