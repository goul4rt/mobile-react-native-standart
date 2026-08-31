import { API_URL } from './client';

export type Sessao = {
  accessToken: string;
  /** Quando o access vence (minutos) — não confundir com `expiresAt`, do refresh. */
  accessExpiresAt: string;
  refreshToken: string;
  expiresAt: string;
};

export type Usuario = { id: string; email: string; name: string | null; createdAt: string };

async function post<T>(rota: string, corpo: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${rota}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(mensagem(res.status, (erro as { error?: string }).error));
  }
  return res.json() as Promise<T>;
}

/**
 * A API não diferencia e-mail inexistente de senha errada de propósito — quem
 * não provou ser dono da conta não descobre se ela existe. A mensagem aqui
 * respeita isso.
 */
function mensagem(status: number, codigo?: string): string {
  if (codigo === 'registration_failed') return 'Não foi possível criar a conta com esse e-mail.';
  if (status === 401) return 'E-mail ou senha incorretos.';
  if (status === 400) return 'Confira os dados e tente de novo.';
  return 'Não conseguimos falar com o servidor. Tente de novo.';
}

export const registrar = (email: string, password: string, name?: string) =>
  post<Sessao>('/v1/auth/register', { email, password, ...(name ? { name } : {}) });

export const entrar = (email: string, password: string) =>
  post<Sessao>('/v1/auth/login', { email, password });

export const renovar = (refreshToken: string) => post<Sessao>('/v1/auth/refresh', { refreshToken });

export const sair = (refreshToken: string) =>
  fetch(`${API_URL}/v1/auth/logout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});

export async function buscarUsuario(accessToken: string): Promise<Usuario> {
  const res = await fetch(`${API_URL}/v1/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('sessão inválida');
  return res.json() as Promise<Usuario>;
}

export async function excluirConta(accessToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/auth/me`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('não foi possível excluir a conta');
}

export async function exportarDados(accessToken: string): Promise<unknown> {
  const res = await fetch(`${API_URL}/v1/auth/me/export`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('não foi possível exportar');
  return res.json();
}
