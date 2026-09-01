import { API_URL } from './client';

export type Session = {
  accessToken: string;
  /** When the access token expires (minutes). Not `expiresAt`, which is the refresh one. */
  accessExpiresAt: string;
  refreshToken: string;
  expiresAt: string;
};

export type User = { id: string; email: string; name: string | null; createdAt: string };

async function post<T>(rota: string, corpo: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${rota}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(mensagem(res.status, (error as { error?: string }).error));
  }
  return res.json() as Promise<T>;
}

/**
 * The API deliberately does not distinguish a missing e-mail from a wrong
 * password: whoever has not proven they own the account does not get to learn
 * whether it exists. This message respects that.
 */
function mensagem(status: number, codigo?: string): string {
  if (codigo === 'registration_failed') return 'Não foi possível criar a conta com esse e-mail.';
  if (status === 401) return 'E-mail ou password incorretos.';
  if (status === 400) return 'Confira os dados e tente de novo.';
  return 'Não conseguimos falar com o servidor. Tente de novo.';
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
