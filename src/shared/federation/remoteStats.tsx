import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Centered } from '../ui-kit/primitives';
import { usePreferences } from '../preferences/PreferencesContext';
import { StatsScreen as BundledStatsScreen } from '../../modules/stats/StatsScreen';
import { space } from '../ui-kit/tokens';
import { loadRemoteModule, loadSavedRemote, registerRemote } from './remote';

/**
 * Renders the Stats screen from a published Zephyr version when one is
 * configured, and from this binary otherwise.
 *
 * Configure the URL in Profile → Federated module. Point it at one version,
 * reopen the tab, then point it at another: the same installed app renders
 * different code. That is the part of Module Federation that a running app can
 * actually show.
 */

type Origin = 'loading' | 'remote' | 'bundled';

function useFederatedStats() {
  const [origin, setOrigin] = useState<Origin>('loading');
  const [Remote, setRemote] = useState<React.ComponentType | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const url = await loadSavedRemote();
      if (!url) {
        if (alive) setOrigin('bundled');
        return;
      }

      try {
        await registerRemote(url);
        const mod = await loadRemoteModule<{ StatsScreen: React.ComponentType }>('stats');
        if (!mod.StatsScreen) throw new Error('remote has no StatsScreen export');
        if (alive) {
          setRemote(() => mod.StatsScreen);
          setOrigin('remote');
        }
      } catch (e) {
        // Offline, URL gone, or version incompatible: the bundled screen is the
        // right answer, but say why so a failed demo is diagnosable.
        if (alive) {
          setErro((e as Error).message);
          setOrigin('bundled');
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { origin, Remote, erro };
}

/** Without this banner a remote screen and a bundled one look identical. */
function OriginBadge({ origin, erro }: { origin: Origin; erro: string | null }) {
  const { palette, type } = usePreferences();
  const remoto = origin === 'remote';
  return (
    <View
      style={{
        paddingVertical: space.sm,
        paddingHorizontal: space.xxl,
        backgroundColor: remoto ? palette.primarySubtle : palette.surfaceAlt,
      }}>
      <Text style={[type.micro, { color: remoto ? palette.primary : palette.textMuted }]}>
        {remoto ? '● ./stats loaded from Zephyr edge' : '○ ./stats from this bundle'}
      </Text>
      {erro && (
        <Text style={[type.micro, { color: palette.textMuted }]} numberOfLines={1}>
          {erro}
        </Text>
      )}
    </View>
  );
}

export function StatsScreen() {
  const { palette, type } = usePreferences();
  const { origin, Remote, erro } = useFederatedStats();

  if (origin === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
        <Text style={[type.caption, { color: palette.textMuted, marginTop: space.md }]}>
          resolving ./stats
        </Text>
      </Centered>
    );
  }

  const Screen = origin === 'remote' && Remote ? Remote : BundledStatsScreen;
  return (
    <View style={{ flex: 1 }}>
      <OriginBadge origin={origin} erro={erro} />
      <Screen />
    </View>
  );
}
