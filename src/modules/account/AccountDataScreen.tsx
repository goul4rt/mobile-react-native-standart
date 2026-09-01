import React, { useState } from 'react';
import { Alert, Share, Text } from 'react-native';
import { BackButton, Screen } from '../../shared/ui-kit/primitives';
import { deleteAccount, exportData } from '../../shared/api/auth';
import { useAuth } from '../../shared/auth/AuthContext';
import { t } from '../../shared/i18n';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import {
  SettingsAction,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from './SettingsList';

/** Everything the LGPD gives the user over their own data, in one screen. */
export function AccountDataScreen({ onBack }: { onBack: () => void }) {
  const { palette, type } = usePreferences();
  const { user, token, forgetSession } = useAuth();
  const [busy, setBusy] = useState(false);

  /** LGPD art. 18: portability. The JSON leaves through the system share sheet. */
  const download = async () => {
    setBusy(true);
    try {
      const access = await token();
      if (!access) throw new Error('session expired');
      const data = await exportData(access);
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      Alert.alert(t('common.didntWork'), t('profile.errorExport'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Two-step deletion, with what will be erased spelled out on screen, as the
   * stores require and the LGPD expects. Without that it is just a dangerous button.
   */
  const remove = () => {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteContinue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('profile.deleteConfirm'), t('profile.deleteLast'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('profile.deleteFinal'),
              style: 'destructive',
              onPress: async () => {
                setBusy(true);
                try {
                  const access = await token();
                  if (!access) throw new Error('session expired');
                  await deleteAccount(access);
                  await forgetSession();
                } catch {
                  Alert.alert(t('common.didntWork'), t('profile.errorDelete'));
                } finally {
                  setBusy(false);
                }
              },
            },
          ]),
      },
    ]);
  };

  return (
    <Screen scroll>
      <BackButton testID="back-profile" onPress={onBack} />
      <Text style={[type.title, { color: palette.text }]}>{t('profile.accountAndData')}</Text>

      <SettingsGroup>
        <SettingsRow label={t('signUp.name')} value={user?.name ?? '—'} />
        <SettingsDivider />
        <SettingsRow label={t('signUp.email')} value={user?.email ?? '—'} />
      </SettingsGroup>

      <SettingsAction
        testID="export-data"
        title={t('profile.exportData')}
        description={t('profile.exportDataDesc')}
        onPress={download}
        disabled={busy}
      />
      <SettingsAction
        testID="delete-account"
        title={t('profile.deleteAccount')}
        description={t('profile.deleteAccountDesc')}
        onPress={remove}
        disabled={busy}
        danger
      />
    </Screen>
  );
}
