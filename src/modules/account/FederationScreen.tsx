import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { BackButton, Button, Screen } from '../../shared/ui-kit/primitives';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { space } from '../../shared/ui-kit/tokens';
import { currentRemote, loadSavedRemote, saveRemote } from '../../shared/federation/remote';
import { Field } from './Field';

/**
 * Points the app at a published Zephyr version, so the Stats tab renders code
 * from the edge instead of from this binary.
 *
 * This screen is what turns the four exposes from published artifacts into a
 * demonstrable round trip: paste one version's URL, open Stats, paste another,
 * open it again. Same installed app, different code, no rebuild.
 *
 * A real product would resolve this from an environment rather than a text
 * field. Here it is a text field on purpose: the URL has to be visible for the
 * mechanism to be visible.
 */
export function FederationScreen({ onBack }: { onBack: () => void }) {
  const { palette, type } = usePreferences();
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    loadSavedRemote().then((atual) => {
      setSaved(atual);
      setUrl(atual ?? '');
    });
  }, []);

  const aplicar = async (valor: string | null) => {
    await saveRemote(valor);
    setSaved(currentRemote().url);
    setUrl(valor ?? '');
    Alert.alert(
      valor ? 'Remote set' : 'Remote cleared',
      valor
        ? 'Open the Stats tab to load it from the edge.'
        : 'Stats will render from this bundle again.',
    );
  };

  return (
    <Screen scroll>
      <BackButton testID="back-federation" onPress={onBack} />
      <Text style={[type.title, { color: palette.text }]}>Federated module</Text>

      <Text style={[type.body, { color: palette.textSecondary, marginTop: space.md }]}>
        Paste the URL of a published version. The Stats tab will load{' '}
        <Text style={{ fontFamily: 'Lexend-SemiBold' }}>./stats</Text> from it instead of from this
        app's own bundle.
      </Text>

      <Text style={[type.caption, { color: palette.textMuted, marginTop: space.sm }]}>
        Every deploy prints one. They look like
        https://&lt;user&gt;-&lt;n&gt;-questiona-questiona-questoes-&lt;hash&gt;-ze.zephyrcloud.app
      </Text>

      <View style={{ marginTop: space.xl }}>
        <Field
          label="Version URL"
          testID="field-remote-url"
          placeholder="https://...-ze.zephyrcloud.app"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button
        testID="apply-remote"
        label="Use this version"
        onPress={() => aplicar(url)}
        disabled={!url.trim()}
        style={{ marginTop: space.lg }}
      />

      <Button
        testID="clear-remote"
        variant="plain"
        label="Use the bundled screen"
        onPress={() => aplicar(null)}
      />

      <View
        style={{
          marginTop: space.xl,
          padding: space.lg,
          borderRadius: 12,
          backgroundColor: palette.surfaceAlt,
        }}>
        <Text style={[type.micro, { color: palette.textMuted }]}>currently loading from</Text>
        <Text style={[type.caption, { color: palette.text, marginTop: space.xs }]}>
          {saved ?? 'this bundle'}
        </Text>
      </View>
    </Screen>
  );
}
