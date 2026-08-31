import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { i18n, idiomaDoSistema, type IdiomaApp } from '../i18n';
import { palettes, type as tipoBase, type Palette } from './tokens';

const CHAVE = '@gabarita/preferencias';

export type Tema = 'claro' | 'escuro' | 'sistema';
export type Escala = 'normal' | 'grande' | 'maior';
/** Língua estrangeira das questões do ENEM — não confundir com o idioma do app. */
export type Idioma = 'ingles' | 'espanhol';

/** O design testou os layouts até 1,3×; não passamos disso. */
const FATOR: Record<Escala, number> = { normal: 1, grande: 1.15, maior: 1.3 };

export type Preferencias = {
  tema: Tema;
  escala: Escala;
  /** Qual língua estrangeira aparece nas questões de Linguagens. */
  idioma: Idioma;
  /** Idioma da interface. Coisa diferente da língua estrangeira da prova. */
  idiomaApp: IdiomaApp;
};

const PADRAO: Preferencias = {
  tema: 'sistema',
  escala: 'normal',
  idioma: 'ingles',
  idiomaApp: idiomaDoSistema(),
};

type Estado = Preferencias & {
  definir: <K extends keyof Preferencias>(chave: K, valor: Preferencias[K]) => void;
  escuro: boolean;
  p: Palette;
  /** Tipografia já escalada pela preferência. */
  type: typeof tipoBase;
};

const Contexto = createContext<Estado | null>(null);

export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const doSistema = useColorScheme() === 'dark';
  const [prefs, setPrefs] = useState<Preferencias>(PADRAO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((bruto) => bruto && setPrefs({ ...PADRAO, ...(JSON.parse(bruto) as Preferencias) }))
      .catch(() => {});
  }, []);

  // O i18n é global; mantê-lo em sincronia aqui evita telas em idiomas
  // diferentes durante a mesma sessão.
  i18n.locale = prefs.idiomaApp;

  const valor = useMemo<Estado>(() => {
    const escuro = prefs.tema === 'sistema' ? doSistema : prefs.tema === 'escuro';
    const fator = FATOR[prefs.escala];

    // Multiplica corpo e entrelinha juntos: só o fontSize quebraria o ritmo.
    const type = Object.fromEntries(
      Object.entries(tipoBase).map(([nome, estilo]) => [
        nome,
        { ...estilo, fontSize: estilo.fontSize * fator, lineHeight: estilo.lineHeight * fator },
      ]),
    ) as typeof tipoBase;

    return {
      ...prefs,
      escuro,
      p: escuro ? palettes.dark : palettes.light,
      type,
      definir: (chave, novo) => {
        setPrefs((atual) => {
          const proximo = { ...atual, [chave]: novo };
          AsyncStorage.setItem(CHAVE, JSON.stringify(proximo)).catch(() => {});
          return proximo;
        });
      },
    };
  }, [doSistema, prefs]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/**
 * Paleta e tipografia já resolvidas pela preferência do usuário. Substitui o
 * `useColorScheme()` direto: aquele ignora a escolha feita no perfil.
 */
export function useTema(): Estado {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useTema precisa estar dentro de PreferenciasProvider');
  return ctx;
}
