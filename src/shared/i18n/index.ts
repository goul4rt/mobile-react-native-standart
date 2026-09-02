import { I18n } from 'i18n-js';
import { NativeModules, Platform } from 'react-native';
import { en, pt } from './translations';
import { sharedSingleton } from '../federation/sharedContext';

export type AppLanguage = 'pt' | 'en';

/*
 * One instance for the whole app, host and remotes alike. A remote loaded from
 * the edge would otherwise build its own and render in the default language
 * while the host is set to another -- see federation/sharedContext.ts.
 */
export const i18n = sharedSingleton('i18n', () => {
  const instance = new I18n({ pt, en });
  instance.enableFallback = true;
  instance.defaultLocale = 'pt';
  return instance;
});

/**
 * System language, without pulling in an extra native library.
 *
 * `NativeModules.SettingsManager` is gone on RN 0.87, so the old lookup silently
 * fell through to the fallback and every device looked Brazilian. Hermes ships
 * Intl, which answers the same question on both platforms and needs no bridge.
 */
export function systemLanguage(): AppLanguage {
  let tag: string | undefined;
  try {
    tag = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    // Intl can be compiled out of Hermes; fall back to the legacy bridge.
    tag =
      Platform.OS === 'ios'
        ? (NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0])
        : NativeModules.I18nManager?.localeIdentifier;
  }
  return String(tag ?? 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
}

/** Typed shortcut: `t('home.greeting', { name })`. */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * Locale for `toLocaleDateString`/`toLocaleString`. Hardcoding 'pt-BR' made dates
 * and numbers render in Brazilian format even with the interface in English.
 */
export function currentLocale(): string {
  return i18n.locale === 'en' ? 'en-US' : 'pt-BR';
}

/** Translated subject label. */
export function subjectLabel(code: string | null | undefined): string {
  return code ? i18n.t(`areas.${code}`, { defaultValue: code }) : '';
}
