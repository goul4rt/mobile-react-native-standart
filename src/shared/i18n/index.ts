import { I18n } from 'i18n-js';
import { NativeModules, Platform } from 'react-native';
import { en, pt } from './traducoes';

export type IdiomaApp = 'pt' | 'en';

export const i18n = new I18n({ pt, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'pt';

/** Idioma do sistema, sem depender de lib nativa extra. */
export function idiomaDoSistema(): IdiomaApp {
  const bruto =
    Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0])
      : NativeModules.I18nManager?.localeIdentifier;
  return String(bruto ?? 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
}

/** Atalho tipado: `t('home.saudacao', { nome })`. */
export function t(chave: string, opcoes?: Record<string, unknown>): string {
  return i18n.t(chave, opcoes);
}

/** Rótulo da área traduzido. Substitui a constante AREA_LABEL em português. */
export function rotuloArea(codigo: string | null | undefined): string {
  return codigo ? i18n.t(`areas.${codigo}`, { defaultValue: codigo }) : '';
}
