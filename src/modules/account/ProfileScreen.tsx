import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '../../shared/ui-kit/primitives';
import { useAuth } from '../../shared/auth/AuthContext';
import { t } from '../../shared/i18n';
import { DOCUMENTOS, abrirDocumento } from '../../shared/documents';
import {
  usePreferences,
  type AppLanguage,
  type ExamLanguage,
  type TextScale,
  type Theme,
} from '../../shared/preferences/PreferencesContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { AccountDataScreen } from './AccountDataScreen';
import {
  SettingsAction,
  SettingsDivider,
  SettingsGroup,
  SettingsLink,
  SettingsOptions,
} from './SettingsList';

export function ProfileScreen() {
  const { palette, type, theme, textScale, examLanguage, appLanguage, set } = usePreferences();
  const { user, signOut } = useAuth();
  const [showingAccount, setShowingAccount] = useState(false);

  /**
   * The sub-screen is state, not a route, so this remote stays self-contained:
   * `./profile` must work in a host that never registered a route for it. The
   * cost is that Android's back gesture would exit the app instead of closing
   * the sub-screen, which is what this handler pays back.
   */
  useEffect(() => {
    if (!showingAccount) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowingAccount(false);
      return true;
    });
    return () => sub.remove();
  }, [showingAccount]);

  if (showingAccount) return <AccountDataScreen onBack={() => setShowingAccount(false)} />;

  return (
    <Screen scroll>
      <Text style={[type.title, { color: palette.text }]}>{t('profile.title')}</Text>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.avatar, { backgroundColor: palette.primarySubtle }]}>
          <Text style={[type.title, { color: palette.primary }]}>
            {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.heading, { color: palette.text }]}>
            {user?.name ?? t('profile.noName')}
          </Text>
          <Text style={[type.caption, { color: palette.textMuted }]}>{user?.email}</Text>
        </View>
      </View>

      <SettingsGroup>
        <SettingsLink
          testID="account-and-data"
          label={t('profile.accountAndData')}
          onPress={() => setShowingAccount(true)}
        />
        <SettingsDivider />

        <SettingsOptions<Theme>
          label={t('profile.theme')}
          value={theme}
          options={[
            ['light', t('profile.themeLight')],
            ['dark', t('profile.themeDark')],
            ['system', t('profile.themeSystem')],
          ]}
          onChoose={(v) => set('theme', v)}
          testIDPrefix="theme"
        />
        <SettingsDivider />

        {/* The design tested layouts up to 1.3x; the options stop there. */}
        <SettingsOptions<TextScale>
          label={t('profile.textSize')}
          value={textScale}
          options={[
            ['normal', 'A'],
            ['large', 'A'],
            ['xlarge', 'A'],
          ]}
          onChoose={(v) => set('textScale', v)}
          testIDPrefix="scale"
          sizes={[13, 16, 20]}
        />
        <SettingsDivider />

        <SettingsOptions<AppLanguage>
          label={t('profile.appLanguage')}
          value={appLanguage}
          options={[
            ['pt', t('profile.portuguese')],
            ['en', t('profile.english')],
          ]}
          onChoose={(v) => set('appLanguage', v)}
          testIDPrefix="app-language"
        />
        <SettingsDivider />

        {/* The EXAM's foreign language: the 5 English or Spanish questions in
            Languages. Nothing to do with the interface language above. */}
        <SettingsOptions<ExamLanguage>
          label={t('profile.examLanguage')}
          value={examLanguage}
          options={[
            ['en', t('profile.english')],
            ['es', t('profile.spanish')],
          ]}
          onChoose={(v) => set('examLanguage', v)}
          testIDPrefix="exam-language"
        />
      </SettingsGroup>

      <View style={{ gap: space.sm }}>
        <Text style={[type.body, { color: palette.text }]}>{t('documents.title')}</Text>
        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingsAction
            testID="open-terms"
            title={t('documents.terms')}
            description={t('documents.opensInBrowser')}
            onPress={() => abrirDocumento(DOCUMENTOS.termos)}
          />
          <SettingsDivider />
          <SettingsAction
            testID="open-privacy"
            title={t('documents.privacyPolicy')}
            description={t('documents.opensInBrowser')}
            onPress={() => abrirDocumento(DOCUMENTOS.politica)}
          />
        </View>
      </View>

      <Button
        testID="sign-out"
        variant="outline"
        label={t('profile.signOut')}
        onPress={signOut}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
    marginTop: space.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
