import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Centered } from '../ui-kit/primitives';
import { usePreferences } from '../preferences/PreferencesContext';
import { StatsScreen as BundledStatsScreen } from '../../modules/stats/StatsScreen';
import { space } from '../ui-kit/tokens';
import { loadExpose } from './loadRemoteBundle';
import { REMOTE_URL } from './remoteUrl';

/**
 * Renders the stats screen from a version published on Zephyr, falling back to
 * the copy in this bundle when no URL is configured or the edge does not answer.
 * The banner names the origin -- without it, remote and local look identical.
 */

type Origin = 'loading' | 'remote' | 'local';

export function RemoteStats() {
  const { palette, type } = usePreferences();
  const { top } = useSafeAreaInsets();
  const [origin, setOrigin] = useState<Origin>(REMOTE_URL ? 'loading' : 'local');
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!REMOTE_URL) return;
    let alive = true;

    loadExpose<{ StatsScreen: React.ComponentType }>(REMOTE_URL, './stats')
      .then((mod) => {
        if (!alive) return;
        setScreen(() => mod.StatsScreen);
        setOrigin('remote');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setOrigin('local');
      });

    return () => {
      alive = false;
    };
  }, []);

  if (origin === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
        <Text style={[type.caption, { color: palette.textMuted, marginTop: space.md }]}>
          loading ./stats from the edge
        </Text>
      </Centered>
    );
  }

  const remote = origin === 'remote';
  const Chosen = remote && Screen ? Screen : BundledStatsScreen;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: top + space.sm,
          paddingBottom: space.sm,
          paddingHorizontal: space.xxl,
          backgroundColor: remote ? palette.primarySubtle : palette.surfaceAlt,
        }}>
        <Text style={[type.micro, { color: remote ? palette.primary : palette.textMuted }]}>
          {remote ? '● ./stats loaded from Zephyr edge' : '○ ./stats from this bundle'}
        </Text>
        {error && (
          <Text style={[type.micro, { color: palette.textMuted }]} numberOfLines={1}>
            {error}
          </Text>
        )}
      </View>
      <Chosen />
    </View>
  );
}
