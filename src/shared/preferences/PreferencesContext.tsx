import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { i18n, idiomaDoSistema } from '../i18n';
import { palettes, type as baseType, type Palette } from '../ui-kit/tokens';
import {
  LEGACY_STORAGE_KEY,
  parsePreferences,
  STORAGE_KEY,
  type AppLanguage,
  type ExamLanguage,
  type Preferences,
  type TextScale,
  type Theme,
} from './migrate';

export type { AppLanguage, ExamLanguage, Preferences, TextScale, Theme };

/** The design tested layouts up to 1.3x; we do not go past that. */
const FACTOR: Record<TextScale, number> = { normal: 1, large: 1.15, xlarge: 1.3 };

const DEFAULTS: Preferences = {
  theme: 'system',
  textScale: 'normal',
  examLanguage: 'en',
  appLanguage: idiomaDoSistema(),
};

type State = Preferences & {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  isDark: boolean;
  palette: Palette;
  /** Typography already scaled by the preference. */
  type: typeof baseType;
};

const Context = createContext<State | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemIsDark = useColorScheme() === 'dark';
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    /** Reads the new format, falling back to v1.0, still present on installed devices. */
    (async () => {
      try {
        const current = await AsyncStorage.getItem(STORAGE_KEY);
        const raw = current ?? (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
        const lidas = parsePreferences(raw);
        if (Object.keys(lidas).length === 0) return;

        setPrefs({ ...DEFAULTS, ...lidas });
        // Rewrite in the new format on first launch, so the next read no longer
        // depends on the legacy key.
        if (!current) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...lidas }));
        }
      } catch {
        // Storage unavailable: defaults are already applied.
      }
    })();
  }, []);

  // i18n is global; syncing it here keeps screens from rendering in different
  // languages within the same session.
  i18n.locale = prefs.appLanguage;

  const value = useMemo<State>(() => {
    const isDark = prefs.theme === 'system' ? systemIsDark : prefs.theme === 'dark';
    const factor = FACTOR[prefs.textScale];

    // Scale size and line height together: fontSize alone would break the rhythm.
    const type = Object.fromEntries(
      Object.entries(baseType).map(([name, style]) => [
        name,
        { ...style, fontSize: style.fontSize * factor, lineHeight: style.lineHeight * factor },
      ]),
    ) as typeof baseType;

    return {
      ...prefs,
      isDark,
      palette: isDark ? palettes.dark : palettes.light,
      type,
      set: (key, next) => {
        setPrefs((current) => {
          const updated = { ...current, [key]: next };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      },
    };
  }, [systemIsDark, prefs]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/**
 * Palette and typography already resolved from the user's preference. Replaces
 * calling `useColorScheme()` directly, which ignores the choice made in Profile.
 */
export function usePreferences(): State {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
