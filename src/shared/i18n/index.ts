import { I18n } from 'i18n-js';
import { NativeModules, Platform } from 'react-native';
import { en, pt } from './translations';

export type IdiomaApp = 'pt' | 'en';

export const i18n = new I18n({ pt, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'pt';

/** System language, without pulling in an extra native library. */
export function idiomaDoSistema(): IdiomaApp {
  const raw =
    Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0])
      : NativeModules.I18nManager?.localeIdentifier;
  return String(raw ?? 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
}

/** Typed shortcut: `t('home.greeting', { name })`. */
export function t(key: string, opcoes?: Record<string, unknown>): string {
  return i18n.t(key, opcoes);
}

/**
 * Locale for `toLocaleDateString`/`toLocaleString`. Hardcoding 'pt-BR' made dates
 * and numbers render in Brazilian format even with the interface in English.
 */
export function localeAtual(): string {
  return i18n.locale === 'en' ? 'en-US' : 'pt-BR';
}

/** Translated subject label. Replaces the Portuguese AREA_LABEL constant. */
export function rotuloArea(codigo: string | null | undefined): string {
  return codigo ? i18n.t(`areas.${codigo}`, { defaultValue: codigo }) : '';
}
