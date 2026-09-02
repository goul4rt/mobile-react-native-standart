import { Platform } from 'react-native';
import { sharedSingleton } from '../federation/sharedContext';

/**
 * The Android emulator cannot see the machine's `localhost`: 10.0.2.2 is the
 * alias for the host. On the iOS simulator, localhost is the host itself.
 */
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

/**
 * Has to match `API_PORT` in the root docker-compose.yml, which also defaults to
 * 3000. Change both when something else already owns the port -- the app cannot
 * read an env var at runtime, so this is the one place that knows.
 */
const DEV_PORT = 3000;

/**
 * The production bundle must point at the public API: `deploy:ios` runs with
 * `--dev false`, and a published bundle pointing at localhost reaches nothing
 * on the device of whoever installed it.
 *
 * Shared through the global registry because a federated remote is ALWAYS built
 * with `--dev false` -- `__DEV__` is false inside it even when the app hosting
 * it is a debug build. Left to decide on its own, a remote screen would query
 * production while everything around it talks to the API on this machine, and
 * the mismatch shows up as an empty screen rather than an error.
 */
export const API_URL = sharedSingleton('apiUrl', () =>
  __DEV__ ? `http://${HOST}:${DEV_PORT}` : 'https://questiona.dublapedia.com',
);

export type Media = { id: string; url: string; alt?: string };
export type RichContent = { format: 'markdown' | 'html'; body: string; media: Media[] };

export type Alternative = { id: string; content: RichContent; correct: boolean };

export type Question = {
  id: string;
  kind: 'mc_single';
  stem: RichContent;
  supports: RichContent[];
  explanation?: RichContent;
  alternatives: Alternative[];
  metadata: {
    year?: number;
    area?: 'LC' | 'CH' | 'CN' | 'MT';
    discipline?: string;
    tags: string[];
  };
};

/**
 * Identifies the device to deduplicate reports. Lives only while the app is
 * open, with no persistent storage yet.
 * ponytail: swap for a disk-backed id once AsyncStorage/MMKV is in play.
 */
export const CLIENT_ID = uuid();

/**
 * The `key` is a contract with the API, which validates it and already has rows
 * stored with it: it does not change. The label comes from i18n, or the menu
 * renders in Portuguese while the interface is in English.
 */
export const REPORT_REASONS = [
  { key: 'enunciado_incompleto', label: 'reasonStatement' },
  { key: 'imagem_nao_carrega', label: 'reasonImage' },
  { key: 'gabarito_errado', label: 'reasonAnswerKey' },
  { key: 'alternativa_faltando', label: 'reasonChoice' },
  { key: 'outro', label: 'reasonOther' },
] as const;

export async function reportarProblema(questionId: string, reason: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId, reason, clientId: CLIENT_ID }),
  });
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
}

export type AreaResumo = { code: string; label: string; total: number; years: number[] };

/** Subjects with published questions, straight from the corpus. */
export async function fetchTaxonomy(): Promise<AreaResumo[]> {
  const res = await fetch(`${API_URL}/v1/taxonomy`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = (await res.json()) as { areas: AreaResumo[] };
  return data.areas;
}

export type Resposta = {
  /** Generated on the device: this is what makes a resend idempotent server-side. */
  clientId: string;
  questionId: string;
  escolha: string;
  correta: boolean;
  tempoMs: number;
};

/**
 * Population average for the subject. The API only returns a row above 30
 * answers; below that the screen explains the absence instead of showing a
 * fragile number.
 */
export async function fetchPopulation(area: string): Promise<{ accuracy: number; users: number } | null> {
  const res = await fetch(`${API_URL}/v1/stats/population`);
  if (!res.ok) return null;
  const data = (await res.json()) as { byArea: { area: string; accuracy: number; users: number }[] };
  return data.byArea.find((a) => a.area === area) ?? null;
}

export async function fetchSession(
  area: string,
  limit = 10,
  /** Portuguese plus the chosen foreign language, never just one of them. */
  idiomas: string[] = ['pt'],
): Promise<Question[]> {
  const lingua = `&language=${idiomas.join(',')}`;
  const res = await fetch(`${API_URL}/v1/questions?area=${area}&random=true&limit=${limit}${lingua}`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = (await res.json()) as { items: Question[] };
  return data.items;
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export type EstatisticaArea = {
  area: string;
  total: number;
  correct: number;
  avg_time_ms: number | null;
};

export type Semana = { week: string; total: number; correct: number };

export type MinhasEstatisticas = {
  overall: { total: number; correct: number; avg_time_ms: number | null };
  byArea: EstatisticaArea[];
  bySkill: { area: string; skill: string; total: number; correct: number }[];
  weekly: Semana[];
};

export type EstatisticaPopulacao = {
  area: string;
  attempts: number;
  users: number;
  accuracy: number;
  avg_time_ms: number | null;
};

async function comToken<T>(rota: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${rota}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchMinhasEstatisticas = (token: string) =>
  comToken<MinhasEstatisticas>('/v1/stats/me', token);

export async function fetchPopulacaoPorArea(): Promise<EstatisticaPopulacao[]> {
  const res = await fetch(`${API_URL}/v1/stats/population`);
  if (!res.ok) return [];
  const data = (await res.json()) as { byArea: EstatisticaPopulacao[] };
  return data.byArea;
}

/** Sends the batch of answers. Idempotent by clientId: resending never duplicates. */
export async function enviarRespostas(
  token: string,
  respostas: { clientId: string; questionId: string; chosen: string; timeMs: number }[],
): Promise<void> {
  if (respostas.length === 0) return;
  const res = await fetch(`${API_URL}/v1/attempts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      attempts: respostas.map((r) => ({
        clientId: r.clientId,
        questionId: r.questionId,
        chosen: { kind: 'mc_single', choice: r.chosen },
        timeMs: r.timeMs,
      })),
    }),
  });
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
}

/** UUID v4 with no dependency: Hermes does not guarantee crypto.randomUUID. */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
