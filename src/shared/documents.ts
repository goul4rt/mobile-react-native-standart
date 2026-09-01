import { Linking } from 'react-native';

/**
 * Documents published outside the app, on GitHub Pages. They stay out of the
 * bundle on purpose: a privacy policy change cannot depend on a store release,
 * or the text in force and the text the user reads drift apart.
 */
const BASE = 'https://goul4rt.github.io/driftwood';

export const DOCUMENTOS = {
  termos: `${BASE}/termos.html`,
  politica: `${BASE}/privacidade.html`,
} as const;

/** Opens in the system browser. Fails silently: nothing to do if there is none. */
export function abrirDocumento(url: string) {
  Linking.openURL(url).catch(() => {});
}
