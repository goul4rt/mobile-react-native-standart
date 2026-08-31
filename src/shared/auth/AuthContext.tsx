import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  buscarUsuario,
  entrar as entrarApi,
  registrar as registrarApi,
  renovar,
  sair as sairApi,
  type Sessao,
  type Usuario,
} from '../api/auth';

const CHAVE = '@gabarita/sessao';

/** Renova antes de expirar: token de 15 min, margem de 1. */
const MARGEM_MS = 60_000;

type Estado = {
  carregando: boolean;
  usuario: Usuario | null;
  registrar: (email: string, senha: string, nome?: string) => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  /** Token válido pra chamada autenticada, renovado se preciso. */
  token: () => Promise<string | null>;
  esquecerSessao: () => Promise<void>;
};

const Contexto = createContext<Estado | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const guardar = useCallback(async (nova: Sessao | null) => {
    setSessao(nova);
    if (nova) await AsyncStorage.setItem(CHAVE, JSON.stringify(nova));
    else await AsyncStorage.removeItem(CHAVE);
  }, []);

  // Sessão sobrevive ao fechar o app: ninguém quer logar de novo toda vez.
  useEffect(() => {
    (async () => {
      try {
        const bruto = await AsyncStorage.getItem(CHAVE);
        if (!bruto) return;
        const salva = JSON.parse(bruto) as Sessao;
        const renovada = await renovar(salva.refreshToken);
        await guardar(renovada);
        setUsuario(await buscarUsuario(renovada.accessToken));
      } catch {
        // Refresh vencido ou revogado: começa deslogado, sem barulho.
        await AsyncStorage.removeItem(CHAVE);
      } finally {
        setCarregando(false);
      }
    })();
  }, [guardar]);

  const apos = useCallback(
    async (nova: Sessao) => {
      await guardar(nova);
      setUsuario(await buscarUsuario(nova.accessToken));
    },
    [guardar],
  );

  const valor = useMemo<Estado>(
    () => ({
      carregando,
      usuario,
      registrar: async (email, senha, nome) => apos(await registrarApi(email, senha, nome)),
      entrar: async (email, senha) => apos(await entrarApi(email, senha)),
      sair: async () => {
        if (sessao) await sairApi(sessao.refreshToken);
        await guardar(null);
        setUsuario(null);
      },
      esquecerSessao: async () => {
        await guardar(null);
        setUsuario(null);
      },
      token: async () => {
        if (!sessao) return null;
        // Prazo do ACCESS, não do refresh: o primeiro vence em minutos.
        const venceEm = new Date(sessao.accessExpiresAt).getTime();
        if (Number.isFinite(venceEm) && venceEm - Date.now() > MARGEM_MS) {
          return sessao.accessToken;
        }
        try {
          const nova = await renovar(sessao.refreshToken);
          await guardar(nova);
          return nova.accessToken;
        } catch {
          await guardar(null);
          setUsuario(null);
          return null;
        }
      },
    }),
    [apos, carregando, guardar, sessao, usuario],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): Estado {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
