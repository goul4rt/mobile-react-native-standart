import { Platform } from 'react-native';

/**
 * O emulador do Android não enxerga `localhost` da máquina: 10.0.2.2 é o alias
 * do host. No simulador do iOS, localhost é o host mesmo.
 */
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// ponytail: constante. Vira variável de ambiente quando houver mais de um
// ambiente (staging/prod) pra apontar.
export const API_URL = `http://${HOST}:3000`;

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

export const AREA_LABEL: Record<string, string> = {
  LC: 'Linguagens',
  CH: 'Ciências Humanas',
  CN: 'Ciências da Natureza',
  MT: 'Matemática',
};

/**
 * Identifica o aparelho pra deduplicar reportes. Vive só enquanto o app está
 * aberto — sem storage persistente ainda.
 * ponytail: trocar por id salvo em disco quando entrar AsyncStorage/MMKV.
 */
export const CLIENT_ID = uuid();

export const MOTIVOS_REPORTE = [
  { chave: 'enunciado_incompleto', rotulo: 'Enunciado incompleto' },
  { chave: 'imagem_nao_carrega', rotulo: 'Imagem não carrega' },
  { chave: 'gabarito_errado', rotulo: 'Gabarito errado' },
  { chave: 'alternativa_faltando', rotulo: 'Falta alternativa' },
  { chave: 'outro', rotulo: 'Outro problema' },
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

/** Áreas com questões publicadas, direto do acervo. */
export async function fetchTaxonomy(): Promise<AreaResumo[]> {
  const res = await fetch(`${API_URL}/v1/taxonomy`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = (await res.json()) as { areas: AreaResumo[] };
  return data.areas;
}

export type Resposta = {
  /** Gerado no aparelho: é o que torna o reenvio idempotente no servidor. */
  clientId: string;
  questionId: string;
  escolha: string;
  correta: boolean;
  tempoMs: number;
};

/**
 * Média da população na área. A API só devolve linha acima de 30 respostas —
 * abaixo disso a tela explica a ausência em vez de mostrar número frágil.
 */
export async function fetchPopulation(area: string): Promise<{ accuracy: number; users: number } | null> {
  const res = await fetch(`${API_URL}/v1/stats/population`);
  if (!res.ok) return null;
  const data = (await res.json()) as { byArea: { area: string; accuracy: number; users: number }[] };
  return data.byArea.find((a) => a.area === area) ?? null;
}

export async function fetchSession(area: string, limit = 10): Promise<Question[]> {
  const res = await fetch(`${API_URL}/v1/questions?area=${area}&random=true&limit=${limit}`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = (await res.json()) as { items: Question[] };
  return data.items;
}

/* ------------------------------------------------------------------ */
/* Estatísticas                                                        */
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

/** Envia o lote de respostas. Idempotente por clientId: reenviar não duplica. */
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

/** UUID v4 sem dependência — o Hermes não garante crypto.randomUUID. */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
