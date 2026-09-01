import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { BackButton, Button, Screen } from '../../shared/ui-kit/primitives';
import { Field } from './Field';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';
import { DOCUMENTOS, abrirDocumento } from '../../shared/documents';

const MIN_PASSWORD = 8;

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
  const canSubmit = consent && email.includes('@') && password.length >= MIN_PASSWORD && !submitting;

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

  const estiloLink = {
    ...type.caption,
    color: palette.primary,
    textDecorationLine: 'underline' as const,
  };

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
          placeholder={t('signUp.passwordPlaceholder', { min: MIN_PASSWORD })}
          value={password}
          onChangeText={setPassword}
          secret
          autoCapitalize="none"
        />
      </View>

      {/*
        Checkbox e texto são irmãos, e os links são Pressable de verdade numa
        linha própria. Duas limitações do iOS levaram a isso: envolver tudo num
        Pressable com role="checkbox" achata a subárvore, e um <Text> com onPress
        aninhado noutro <Text> nunca vira elemento de acessibilidade — em ambos
        os casos o VoiceOver anunciava só "checkbox, unchecked" e não havia como
        abrir os documentos que se estava aceitando.
      */}
      <View style={styles.consent}>
        <Pressable
          testID="consent"
          onPress={() => setConsent((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          accessibilityLabel={t('signUp.consent')}
          hitSlop={8}>
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
        </Pressable>
        <Text style={[type.caption, { color: palette.textSecondary, flex: 1 }]}>
          {t('signUp.consent')}
        </Text>
      </View>

      <View style={styles.links}>
        <Pressable
          testID="link-terms"
          accessibilityRole="link"
          onPress={() => abrirDocumento(DOCUMENTOS.termos)}
          hitSlop={8}>
          <Text style={estiloLink}>{t('documents.terms')}</Text>
        </Pressable>
        <Text style={[type.caption, { color: palette.textMuted }]}>·</Text>
        <Pressable
          testID="link-privacy"
          accessibilityRole="link"
          onPress={() => abrirDocumento(DOCUMENTOS.politica)}
          hitSlop={8}>
          <Text style={estiloLink}>{t('documents.privacyPolicy')}</Text>
        </Pressable>
      </View>

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
  links: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    marginLeft: 24 + space.md,
  },
  caixinha: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
