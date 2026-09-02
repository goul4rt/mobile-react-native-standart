import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { sharedContext } from '../federation/sharedContext';
import {
  fetchUser,
  signIn as entrarApi,
  signUp as registrarApi,
  refreshSession,
  signOut as sairApi,
  type ApiError,
  type Session,
  type User,
} from '../api/auth';

/**
 * The key keeps its old name on purpose: it holds the token of everyone already
 * signed in, and renaming it would sign out the whole installed base in exchange
 * for nothing the user notices. It only changes if a fallback migration ever
 * becomes worth it, as done in `preferences/migrate.ts`.
 */
const STORAGE_KEY = '@gabarita/session';

/**
 * Whether a failed refresh means the credential is dead, or just that the
 * network is. Only the server rejecting the token justifies erasing it: a 429
 * from the rate limiter, a 500, or no connection at all are transient, and
 * signing out on those loses the session of someone who only had bad signal.
 */
function credentialRejected(error: unknown): boolean {
  const status = (error as ApiError)?.status;
  return status === 401 || status === 403;
}

/** Renews before expiry: 15-minute token, 1-minute margin. */
const RENEW_MARGIN_MS = 60_000;

type State = {
  loading: boolean;
  user: User | null;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** A valid token for an authenticated call, renewed if needed. */
  token: () => Promise<string | null>;
  forgetSession: () => Promise<void>;
};

const Context = sharedContext<State | null>('auth', null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setCarregando] = useState(true);

  const store = useCallback(async (nova: Session | null) => {
    setSession(nova);
    if (nova) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nova));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // The session survives closing the app: nobody wants to sign in every time.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const salva = JSON.parse(raw) as Session;
        const renovada = await refreshSession(salva.refreshToken);
        await store(renovada);
        setUser(await fetchUser(renovada.accessToken));
      } catch (error) {
        // Refresh expired or revoked: start signed out, quietly. Anything else
        // keeps the session on disk for the next launch to retry.
        if (credentialRejected(error)) await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setCarregando(false);
      }
    })();
  }, [store]);

  const apos = useCallback(
    async (nova: Session) => {
      await store(nova);
      setUser(await fetchUser(nova.accessToken));
    },
    [store],
  );

  const value = useMemo<State>(
    () => ({
      loading,
      user,
      signUp: async (email, password, name) => apos(await registrarApi(email, password, name)),
      signIn: async (email, password) => apos(await entrarApi(email, password)),
      signOut: async () => {
        if (session) await sairApi(session.refreshToken);
        await store(null);
        setUser(null);
      },
      forgetSession: async () => {
        await store(null);
        setUser(null);
      },
      token: async () => {
        if (!session) return null;
        // The ACCESS deadline, not the refresh one: the former expires in minutes.
        const venceEm = new Date(session.accessExpiresAt).getTime();
        if (Number.isFinite(venceEm) && venceEm - Date.now() > RENEW_MARGIN_MS) {
          return session.accessToken;
        }
        try {
          const renewed = await refreshSession(session.refreshToken);
          await store(renewed);
          return renewed.accessToken;
        } catch (error) {
          if (credentialRejected(error)) {
            await store(null);
            setUser(null);
          }
          return null;
        }
      },
    }),
    [apos, loading, store, session, user],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): State {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
