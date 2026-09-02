import { API_URL } from './client';
import { t } from '../i18n';

export type Session = {
  accessToken: string;
  /** When the access token expires (minutes). Not `expiresAt`, which is the refresh one. */
  accessExpiresAt: string;
  refreshToken: string;
  expiresAt: string;
};

export type User = { id: string; email: string; name: string | null; createdAt: string };

/** An API failure, carrying the status so callers can tell apart what it means. */
export type ApiError = Error & { status: number };

async function post<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const failure = new Error(
      message(res.status, (error as { error?: string }).error),
    ) as ApiError;
    failure.status = res.status;
    throw failure;
  }
  return res.json() as Promise<T>;
}

/**
 * The API deliberately does not distinguish a missing e-mail from a wrong
 * password: whoever has not proven they own the account does not get to learn
 * whether it exists. This message respects that.
 */
function message(status: number, code?: string): string {
  if (code === 'registration_failed') return t('signUp.errorEmailTaken');
  if (status === 401) return t('signUp.errorCredentials');
  if (status === 400) return t('signUp.errorData');
  return t('signUp.errorServer');
}

export const signUp = (email: string, password: string, name?: string) =>
  post<Session>('/v1/auth/register', { email, password, ...(name ? { name } : {}) });

export const signIn = (email: string, password: string) =>
  post<Session>('/v1/auth/login', { email, password });

export const refreshSession = (refreshToken: string) => post<Session>('/v1/auth/refresh', { refreshToken });

export const signOut = (refreshToken: string) =>
  fetch(`${API_URL}/v1/auth/logout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});

export async function fetchUser(accessToken: string): Promise<User> {
  const res = await fetch(`${API_URL}/v1/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('sessão inválida');
  return res.json() as Promise<User>;
}

export async function deleteAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/auth/me`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('não foi possível excluir a conta');
}

export async function exportData(accessToken: string): Promise<unknown> {
  const res = await fetch(`${API_URL}/v1/auth/me/export`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('não foi possível exportar');
  return res.json();
}
