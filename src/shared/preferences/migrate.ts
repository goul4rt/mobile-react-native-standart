/**
 * v1.0 wrote preferences in Portuguese under `@gabarita/preferencias`, and those
 * devices exist. Without translating on read, the app would silently fall back
 * to defaults and existing users would lose theme, text size and language.
 */

export type Theme = 'light' | 'dark' | 'system';
export type TextScale = 'normal' | 'large' | 'xlarge';
/** Foreign language of the ENEM questions, not the interface language. */
export type ExamLanguage = 'en' | 'es';
export type AppLanguage = 'pt' | 'en';

export type Preferences = {
  theme: Theme;
  textScale: TextScale;
  examLanguage: ExamLanguage;
  appLanguage: AppLanguage;
};

export const LEGACY_STORAGE_KEY = '@gabarita/preferencias';
export const STORAGE_KEY = '@questiona/preferences';

const THEME: Record<string, Theme> = { claro: 'light', escuro: 'dark', sistema: 'system' };
const SCALE: Record<string, TextScale> = { normal: 'normal', grande: 'large', maior: 'xlarge' };
const EXAM: Record<string, ExamLanguage> = { ingles: 'en', espanhol: 'es' };

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'system';
const isScale = (v: unknown): v is TextScale =>
  v === 'normal' || v === 'large' || v === 'xlarge';
const isExam = (v: unknown): v is ExamLanguage => v === 'en' || v === 'es';
const isApp = (v: unknown): v is AppLanguage => v === 'pt' || v === 'en';

/**
 * Accepts both formats and returns only what it recognizes: a corrupted field
 * becomes absent instead of breaking the others.
 */
export function parsePreferences(raw: string | null): Partial<Preferences> {
  if (!raw) return {};

  let dados: Record<string, unknown>;
  try {
    const json: unknown = JSON.parse(raw);
    if (typeof json !== 'object' || json === null) return {};
    dados = json as Record<string, unknown>;
  } catch {
    return {};
  }

  const saida: Partial<Preferences> = {};

  const theme = dados.theme ?? (typeof dados.tema === 'string' ? THEME[dados.tema] : undefined);
  if (isTheme(theme)) saida.theme = theme;

  const scale =
    dados.textScale ?? (typeof dados.escala === 'string' ? SCALE[dados.escala] : undefined);
  if (isScale(scale)) saida.textScale = scale;

  const exam =
    dados.examLanguage ?? (typeof dados.idioma === 'string' ? EXAM[dados.idioma] : undefined);
  if (isExam(exam)) saida.examLanguage = exam;

  const app = dados.appLanguage ?? dados.idiomaApp;
  if (isApp(app)) saida.appLanguage = app;

  return saida;
}
